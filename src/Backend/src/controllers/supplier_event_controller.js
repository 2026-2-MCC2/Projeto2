// Regras de acesso e composição das respostas dos eventos visíveis para fornecedores,
// e o envio de proposta para um item de custo (RF10).

import { UniqueConstraintError } from 'sequelize'

import {
  ForbiddenProfile,
  InvalidParameter,
  NotFoundBudgetItem,
  NotFoundEvent,
  ProposalAlreadySent,
  ProposalValidUntilAfterEvent,
  ProposalValidUntilInPast,
} from '../errors/index.js'
import { ProposalRepository } from '../repositories/proposal_repository.js'
import { SupplierEventRepository } from '../repositories/supplier_event_repository.js'
import { UserRepository } from '../repositories/user_repository.js'
import { BaseController } from './base_controller.js'
import { SupplierEventDto, SupplierProposalDto } from '../dtos/supplier_event_dto.js'

export class SupplierEventController extends BaseController {
  constructor(context) {
    super(context, 'SupplierEventController')
    this.userRepository = new UserRepository(context)
    this.supplierEventRepository = new SupplierEventRepository(context)
    this.proposalRepository = new ProposalRepository(context)
  }

  async getAvailableEvents(userKey, { search, limit, page }) {
    const supplier = await this.#getSupplier(userKey)
    const offset = page * limit
    const { events, total } = await this.supplierEventRepository.getAvailableEvents(supplier.id, {
      search,
      limit,
      offset,
    })

    return {
      data: SupplierEventDto.fromList(events),
      total,
      is_last_page: offset + events.length >= total,
    }
  }

  async getAvailableEvent(userKey, eventKey) {
    const supplier = await this.#getSupplier(userKey)
    const event = await this.#getAvailableEventOf(supplier, eventKey)

    const items = await this.supplierEventRepository.getAvailableItems(event.id, supplier.id)
    return SupplierEventDto.fromDetail(event, items)
  }

  // Mesma visibilidade do getAvailableEvent: evento em cotação e item numa categoria do fornecedor.
  // Evento ou item fora disso responde 404, sem revelar que eles existem.
  async createProposal(userKey, eventKey, itemKey, payload) {
    const supplier = await this.#getSupplier(userKey)
    const event = await this.#getAvailableEventOf(supplier, eventKey, { lock: true })

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
      proposal = await this.proposalRepository.create(supplier.id, item.id, {
        amount: payload.amount,
        description: payload.description.trim(),
        not_included: optionalText(payload.not_included),
        delivery_terms: payload.delivery_terms.trim(),
        payment_terms: payload.payment_terms.trim(),
        team: optionalText(payload.team),
        warranty: optionalText(payload.warranty),
        valid_until: payload.valid_until,
        notes: optionalText(payload.notes),
      })
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

  async #getAvailableEventOf(supplier, eventKey, options) {
    const event = await this.supplierEventRepository.getAvailableEvent(supplier.id, eventKey, options)
    if (!event) {
      throw new NotFoundEvent(eventKey)
    }
    return event
  }

  async #getSupplier(userKey) {
    const user = await this.userRepository.getProfileByKey(userKey)
    if (!user?.supplier) {
      throw new ForbiddenProfile()
    }

    return user.supplier
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
