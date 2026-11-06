import { UniqueConstraintError } from 'sequelize'

import { StorageConnector } from '../connectors/storage/index.js'
import { EVENT_STATUSES, PROPOSAL_STATUSES } from '../constants.js'
import { SupplierProposalDto } from '../dtos/supplier_proposal_dto.js'
import {
  InvalidParameter,
  InvalidSchema,
  InvalidProposalPhoto,
  NotFoundBudgetItem,
  NotFoundEvent,
  NotFoundProposal,
  NotFoundProposalPhoto,
  ProposalAlreadySent,
  ProposalCannotBeChanged,
  ProposalEventNotOpen,
  ProposalItemAlreadyDecided,
  ProposalPhotoLimitReached,
  ProposalValidUntilAfterEvent,
  ProposalValidUntilInPast,
} from '../errors/index.js'
import { ProposalRepository } from '../repositories/proposal_repository.js'
import { SupplierEventRepository } from '../repositories/supplier_event_repository.js'
import { UserRepository } from '../repositories/user_repository.js'
import { ensureAtMostTwoDecimals } from '../utils/money_tools.js'
import {
  buildPhotoPath,
  detectImageType,
  firstFreePosition,
  isPhotoKey,
  MAX_PHOTOS_PER_PROPOSAL,
  possiblePhotoPaths,
  toPhotoResponses,
} from '../utils/proposal_photo_tools.js'
import { BaseController } from './base_controller.js'
import { getSupplierOfUser } from './supplier_access.js'

export class SupplierProposalController extends BaseController {
  constructor(context) {
    super(context, 'SupplierProposalController')
    this.userRepository = new UserRepository(context)
    this.supplierEventRepository = new SupplierEventRepository(context)
    this.proposalRepository = new ProposalRepository(context)
  }

  // evento ou item fora da visibilidade do fornecedor responde 404, sem revelar que eles existem
  async createProposal(userKey, eventKey, itemKey, payload) {
    ensureAtMostTwoDecimals(payload.amount, 'amount')
    const supplier = await getSupplierOfUser(this.userRepository, userKey)
    const event = await this.supplierEventRepository.getAvailableEvent(supplier.id, eventKey, { lock: true })
    if (!event) {
      throw new NotFoundEvent(eventKey)
    }

    const item = await this.supplierEventRepository.getAvailableItem(event.id, supplier.id, itemKey)
    if (!item) {
      throw new NotFoundBudgetItem(itemKey)
    }

    ensureValidUntilInsideEvent(payload.valid_until, event.end_date)

    if (await this.proposalRepository.hasAcceptedProposal(item.id)) {
      throw new ProposalItemAlreadyDecided()
    }

    if (await this.proposalRepository.getBySupplierAndItem(supplier.id, item.id)) {
      throw new ProposalAlreadySent()
    }

    let proposal
    try {
      proposal = await this.proposalRepository.create(supplier.id, item.id, toProposalFields(payload))
    } catch (error) {
      // duas requisições juntas passam pela busca acima; o UNIQUE(budget_item_id, supplier_id) barra a segunda
      if (error instanceof UniqueConstraintError && Object.keys(error.fields ?? {}).includes('budget_item_id')) {
        throw new ProposalAlreadySent()
      }
      throw error
    }

    await this.session.commit()
    return SupplierProposalDto.fromCreated(proposal)
  }

  async getProposals(userKey, { status, limit, page, after }) {
    const statuses = status === undefined ? [] : [...new Set(status.split(','))]
    const invalid = statuses.find((value) => !Object.values(PROPOSAL_STATUSES).includes(value))
    if (invalid !== undefined) {
      throw new InvalidParameter(`The "status" parameter is invalid. Status ${invalid} does not exist.`)
    }

    const supplier = await getSupplierOfUser(this.userRepository, userKey)
    const counts = await this.proposalRepository.getSupplierProposalCounts(supplier.id)

    if (after !== undefined) {
      return this.#getProposalsAfter(supplier.id, { statuses, limit, after }, counts)
    }

    const offset = page * limit
    const { proposals, total } = await this.proposalRepository.getSupplierProposals(supplier.id, { statuses, limit, offset })

    const isLastPage = offset + proposals.length >= total
    return {
      data: SupplierProposalDto.fromList(proposals),
      total,
      is_last_page: isLastPage,
      next_cursor: isLastPage ? null : toCursor(proposals.at(-1)),
      counts: toStatusCounts(counts),
    }
  }

  async #getProposalsAfter(supplierId, { statuses, limit, after }, counts) {
    const cursor = fromCursor(after)
    const rows = await this.proposalRepository.getSupplierProposalsAfter(supplierId, { statuses, limit, cursor })
    const page = rows.slice(0, limit)
    const isLastPage = rows.length <= limit
    const statusCounts = toStatusCounts(counts)
    return {
      data: SupplierProposalDto.fromList(page),
      total: statuses.length ? statuses.reduce((sum, value) => sum + statusCounts[value], 0) : statusCounts.all,
      is_last_page: isLastPage,
      next_cursor: isLastPage ? null : toCursor(page.at(-1)),
      counts: statusCounts,
    }
  }

  async getProposal(userKey, proposalKey) {
    const supplier = await getSupplierOfUser(this.userRepository, userKey)
    return this.#getProposalDetail(supplier.id, proposalKey)
  }

  async updateProposal(userKey, proposalKey, payload) {
    ensureAtMostTwoDecimals(payload.amount, 'amount')
    const supplier = await getSupplierOfUser(this.userRepository, userKey)
    const { proposal, event } = await this.#getChangeableProposal(supplier.id, proposalKey)

    ensureValidUntilInsideEvent(payload.valid_until, event.end_date)
    await this.proposalRepository.update(proposal, toProposalFields(payload))

    // a URL das fotos é assinada depois do commit, para não segurar o evento travado
    return this.#getProposalDetail(supplier.id, proposalKey)
  }

  // não há status "retirada": a proposta é apagada e o fornecedor pode enviar outra enquanto o evento estiver em cotação
  async deleteProposal(userKey, proposalKey) {
    const supplier = await getSupplierOfUser(this.userRepository, userKey)
    const { proposal } = await this.#getChangeableProposal(supplier.id, proposalKey)
    const photos = await this.proposalRepository.getPhotos(proposal.id, { lock: true })

    // os registros das fotos saem junto com a proposta (ON DELETE CASCADE); os arquivos, só depois do commit
    await this.proposalRepository.delete(proposal)
    await this.session.commit()
    await this.#removeFiles(photos.map((photo) => photo.url))
  }

  // confere sem trava antes de gravar o arquivo e de novo com trava depois, para um envio lento não segurar o evento travado
  async addPhoto(userKey, proposalKey, file) {
    const imageType = detectImageType(file.buffer)
    if (!imageType) {
      throw new InvalidProposalPhoto()
    }

    const supplier = await getSupplierOfUser(this.userRepository, userKey)
    const reference = await this.proposalRepository.getSupplierProposalByKey(supplier.id, proposalKey)
    if (!reference) {
      throw new NotFoundProposal(proposalKey)
    }
    if (reference.status !== PROPOSAL_STATUSES.SENT) {
      throw new ProposalCannotBeChanged(reference.status)
    }
    if (firstFreePosition(await this.proposalRepository.getPhotos(reference.id)) === null) {
      throw new ProposalPhotoLimitReached(MAX_PHOTOS_PER_PROPOSAL)
    }

    const { photoKey, path } = buildPhotoPath(proposalKey, imageType.extension)
    await StorageConnector.save(file.buffer, imageType.contentType, path)

    try {
      const { proposal } = await this.#getChangeableProposal(supplier.id, proposalKey)
      const position = firstFreePosition(await this.proposalRepository.getPhotos(proposal.id, { lock: true }))
      if (position === null) {
        throw new ProposalPhotoLimitReached(MAX_PHOTOS_PER_PROPOSAL)
      }

      await this.proposalRepository.createPhoto(proposal.id, position, path)
      await this.session.commit()
    } catch (error) {
      await this.#removeFiles([path])
      throw error
    }

    // se a assinatura falhar, a resposta continua 201 (sem url) para o fornecedor não reenviar e duplicar a foto
    const [photo] = await toPhotoResponses([{ url: path }])
    return photo
  }

  // registro primeiro e arquivo depois: uma falha deixa só um arquivo órfão, nunca um registro apontando para o nada
  async deletePhoto(userKey, proposalKey, photoKey) {
    const supplier = await getSupplierOfUser(this.userRepository, userKey)
    const { proposal } = await this.#getChangeableProposal(supplier.id, proposalKey)

    const photo = isPhotoKey(photoKey)
      ? await this.proposalRepository.getPhotoByPaths(proposal.id, possiblePhotoPaths(proposalKey, photoKey))
      : null
    if (!photo) {
      throw new NotFoundProposalPhoto(photoKey)
    }

    await this.proposalRepository.deletePhoto(photo)
    await this.session.commit()
    await this.#removeFiles([photo.url])
  }

  // depois do commit uma falha aqui não pode virar erro para o fornecedor: fica no log para limpeza manual
  async #removeFiles(paths) {
    for (const path of paths) {
      try {
        await StorageConnector.remove(path)
      } catch (error) {
        this.logger.error(`Could not remove stored file ${path}; it is no longer referenced and can be deleted`, {
          error: error.message,
        })
      }
    }
  }

  // commit antes de assinar as URLs, para a conexão do banco voltar ao pool enquanto o GCS responde
  async #getProposalDetail(supplierId, proposalKey) {
    const detail = await this.#readProposalDetail(supplierId, proposalKey)
    await this.session.commit()
    return this.#buildProposalDetail(detail)
  }

  async #readProposalDetail(supplierId, proposalKey) {
    const proposal = await this.proposalRepository.getSupplierProposalByKey(supplierId, proposalKey)
    if (!proposal) {
      throw new NotFoundProposal(proposalKey)
    }
    return { proposal, photos: await this.proposalRepository.getPhotos(proposal.id) }
  }

  async #buildProposalDetail({ proposal, photos }) {
    return SupplierProposalDto.fromDetail(proposal, await toPhotoResponses(photos))
  }

  // travas na mesma ordem do aceite do organizador (evento, depois proposta), para os dois não se bloquearem
  async #getChangeableProposal(supplierId, proposalKey) {
    const reference = await this.proposalRepository.getSupplierProposalByKey(supplierId, proposalKey)
    if (!reference) {
      throw new NotFoundProposal(proposalKey)
    }

    const event = await this.supplierEventRepository.getEventForShare(reference.event_id)
    const proposal = await this.proposalRepository.getSupplierProposalForUpdate(supplierId, proposalKey)
    // apagada por outra requisição entre a busca e a trava
    if (!event || !proposal) {
      throw new NotFoundProposal(proposalKey)
    }

    if (proposal.status !== PROPOSAL_STATUSES.SENT) {
      throw new ProposalCannotBeChanged(proposal.status)
    }
    // evento de organizador bloqueado sai de cotação para o fornecedor, como na listagem e no envio
    if (event.status !== EVENT_STATUSES.OPEN_FOR_QUOTES || !event.organizer_is_approved) {
      throw new ProposalEventNotOpen()
    }

    return { proposal, event }
  }
}

// data de envio e id de desempate da última proposta mostrada; o front só repassa, não lê
function toCursor(proposal) {
  return Buffer.from(JSON.stringify([new Date(proposal.sent_at).toISOString(), proposal.position_id])).toString('base64url')
}

function fromCursor(after) {
  try {
    const [sentAt, proposalId] = JSON.parse(Buffer.from(after, 'base64url').toString('utf8'))
    const date = new Date(sentAt)
    if (Number.isNaN(date.getTime()) || !Number.isInteger(proposalId)) throw new Error('invalid cursor')
    return { sentAt: date, proposalId }
  } catch {
    throw new InvalidParameter('The "after" parameter is invalid. Use the next_cursor of the previous page.')
  }
}

// todos os status aparecem, com zero quando o fornecedor não tem proposta naquele status
function toStatusCounts(rows) {
  const counts = Object.fromEntries(Object.values(PROPOSAL_STATUSES).map((status) => [status, 0]))
  rows.forEach((row) => {
    counts[row.status] = Number(row.total)
  })
  return { all: rows.reduce((sum, row) => sum + Number(row.total), 0), ...counts }
}

function toProposalFields(payload) {
  return {
    amount: payload.amount,
    description: payload.description.trim(),
    not_included: optionalText(payload.not_included),
    delivery_terms: payload.delivery_terms.trim(),
    payment_terms: payload.payment_terms.trim(),
    team: optionalText(payload.team),
    warranty: optionalText(payload.warranty),
    valid_until: payload.valid_until,
    notes: optionalText(payload.notes),
  }
}

// "hoje" é o dia de Brasília, como o fornecedor vê na tela; em UTC, das 21h à meia-noite a validade de hoje seria recusada
function ensureValidUntilInsideEvent(validUntil, eventEndDate) {
  // o schema só confere o formato: 2026-02-31 passa por ele, mas não existe no calendário
  const validUntilDate = new Date(`${validUntil}T00:00:00.000Z`)
  if (Number.isNaN(validUntilDate.getTime()) || toUtcDateString(validUntilDate) !== validUntil) {
    throw new InvalidSchema(
      `The valid_until ${validUntil} is not a date that exists in the calendar.`,
      'A data de validade informada não existe no calendário.',
    )
  }

  if (validUntil < toBrazilDateString(new Date())) {
    throw new ProposalValidUntilInPast()
  }
  if (validUntil > toBrazilDateString(new Date(eventEndDate))) {
    throw new ProposalValidUntilAfterEvent()
  }
}

function toUtcDateString(date) {
  return date.toISOString().slice(0, 10)
}

// en-CA formata a data como AAAA-MM-DD
const BRAZIL_DATE_FORMAT = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' })

function toBrazilDateString(date) {
  return BRAZIL_DATE_FORMAT.format(date)
}

function optionalText(value) {
  return value?.trim() || null
}
