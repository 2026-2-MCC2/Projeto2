// Regras das propostas do fornecedor: envio (RF10), histórico, detalhe, edição e retirada.

import { UniqueConstraintError } from 'sequelize'

import { EVENT_STATUSES, PROPOSAL_STATUSES } from '../constants.js'
import { SupplierProposalDto } from '../dtos/supplier_proposal_dto.js'
import {
  InvalidParameter,
  NotFoundBudgetItem,
  NotFoundEvent,
  NotFoundProposal,
  ProposalAlreadySent,
  ProposalCannotBeChanged,
  ProposalEventNotOpen,
  ProposalValidUntilAfterEvent,
  ProposalValidUntilInPast,
} from '../errors/index.js'
import { ProposalRepository } from '../repositories/proposal_repository.js'
import { SupplierEventRepository } from '../repositories/supplier_event_repository.js'
import { UserRepository } from '../repositories/user_repository.js'
import { BaseController } from './base_controller.js'
import { getSupplierOfUser } from './supplier_access.js'

export class SupplierProposalController extends BaseController {
  constructor(context) {
    super(context, 'SupplierProposalController')
    this.userRepository = new UserRepository(context)
    this.supplierEventRepository = new SupplierEventRepository(context)
    this.proposalRepository = new ProposalRepository(context)
  }

  // Mesma visibilidade do SupplierEventController.getAvailableEvent: evento em cotação e item numa
  // categoria do fornecedor. Evento ou item fora disso responde 404, sem revelar que eles existem.
  async createProposal(userKey, eventKey, itemKey, payload) {
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

    // um fornecedor, uma proposta por item
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

  async getProposals(userKey, { status, limit, page }) {
    if (status !== undefined && !Object.values(PROPOSAL_STATUSES).includes(status)) {
      throw new InvalidParameter(`The "status" parameter is invalid. Status ${status} does not exist.`)
    }

    const supplier = await getSupplierOfUser(this.userRepository, userKey)
    const offset = page * limit
    const { proposals, total } = await this.proposalRepository.getSupplierProposals(supplier.id, { status, limit, offset })

    return {
      data: SupplierProposalDto.fromList(proposals),
      total,
      is_last_page: offset + proposals.length >= total,
    }
  }

  async getProposal(userKey, proposalKey) {
    const supplier = await getSupplierOfUser(this.userRepository, userKey)
    return this.#getProposalDetail(supplier.id, proposalKey)
  }

  // mesmo schema e mesmas regras de validade do envio
  async updateProposal(userKey, proposalKey, payload) {
    const supplier = await getSupplierOfUser(this.userRepository, userKey)
    const { proposal, event } = await this.#getChangeableProposal(supplier.id, proposalKey)

    ensureValidUntilInsideEvent(payload.valid_until, event.end_date)
    await this.proposalRepository.update(proposal, toProposalFields(payload))

    const proposalDto = await this.#getProposalDetail(supplier.id, proposalKey)
    await this.session.commit()
    return proposalDto
  }

  // O banco não tem status "retirada": a retirada apaga a proposta, e o fornecedor pode enviar outra
  // para o item enquanto o evento estiver em cotação.
  async deleteProposal(userKey, proposalKey) {
    const supplier = await getSupplierOfUser(this.userRepository, userKey)
    const { proposal } = await this.#getChangeableProposal(supplier.id, proposalKey)

    await this.proposalRepository.delete(proposal)
    await this.session.commit()
  }

  async #getProposalDetail(supplierId, proposalKey) {
    const proposal = await this.proposalRepository.getSupplierProposalByKey(supplierId, proposalKey)
    if (!proposal) {
      throw new NotFoundProposal(proposalKey)
    }

    const photos = await this.proposalRepository.getPhotos(proposal.id)
    return SupplierProposalDto.fromDetail(proposal, photos)
  }

  // Só a proposta enviada, ainda não analisada, de um evento em cotação pode mudar. As travas seguem
  // a ordem do aceite do organizador (evento, depois proposta), para os dois não se bloquearem.
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
    if (event.status !== EVENT_STATUSES.OPEN_FOR_QUOTES) {
      throw new ProposalEventNotOpen()
    }

    return { proposal, event }
  }
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

// As datas são comparadas em UTC, como a validade das propostas no ProposalRepository (UTC_DATE()).
function ensureValidUntilInsideEvent(validUntil, eventEndDate) {
  // o schema só confere o formato: 2026-02-31 passa por ele, mas não existe no calendário
  const validUntilDate = new Date(`${validUntil}T00:00:00.000Z`)
  if (Number.isNaN(validUntilDate.getTime()) || toUtcDateString(validUntilDate) !== validUntil) {
    throw new InvalidParameter(`The valid_until ${validUntil} is not a date that exists in the calendar.`)
  }

  if (validUntil < toUtcDateString(new Date())) {
    throw new ProposalValidUntilInPast()
  }
  if (validUntil > toUtcDateString(new Date(eventEndDate))) {
    throw new ProposalValidUntilAfterEvent()
  }
}

function toUtcDateString(date) {
  return date.toISOString().slice(0, 10)
}

// campo opcional vazio ou só com espaços vira NULL no banco
function optionalText(value) {
  return value?.trim() || null
}
