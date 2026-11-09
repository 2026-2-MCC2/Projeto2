import { BaseController } from './base_controller.js'
import { Notifier } from './notifier.js'
import {
  EVENT_STATUS_TRANSITIONS,
  EVENT_STATUSES,
  FRONT_URL,
  PROPOSAL_STATUSES,
  REFERENCE_SCENARIOS,
  isFinalEventStatus,
} from '../constants.js'
import { EventDto } from '../dtos/event_dto.js'
import {
  EventCannotBeModified,
  EventCannotBePublished,
  EventNotOpenForQuotes,
  EventCapacityLessThanMaxAudience,
  EventEndDateBeforeStartDate,
  EventInvalidDate,
  EventExpectedAudienceLessThanMin,
  EventMaxAudienceLessThanExpected,
  EventHasItemsWithoutAcceptedProposal,
  EventStatusConflict,
  InvalidParameter,
  NotFoundEvent,
  NotFoundInternalCost,
  NotFoundOrganizer,
  NotFoundProposal,
  NotFoundUser,
} from '../errors/index.js'
import { EventRepository } from '../repositories/event_repository.js'
import { InternalCostRepository } from '../repositories/internal_cost_repository.js'
import { OrganizerRepository } from '../repositories/organizer_repository.js'
import { ProposalRepository } from '../repositories/proposal_repository.js'
import { SupplierEventRepository } from '../repositories/supplier_event_repository.js'
import { UserRepository } from '../repositories/user_repository.js'
import { ProposalComparisonDTO } from '../dtos/proposal_comparison_dto.js'
import { EmailTemplates } from '../utils/email_templates.js'
import { ensureAtMostTwoDecimals } from '../utils/money_tools.js'
import { NotificationDrafts } from '../utils/notification_drafts.js'
import { toPhotoResponses } from '../utils/proposal_photo_tools.js'
import { TextTools } from '../utils/text_tools.js'

const STATUS_CONFLICT_MESSAGES = {
  [EVENT_STATUSES.DRAFT]: 'Publique o evento para cotação antes de encerrá-lo.',
  [EVENT_STATUSES.OPEN_FOR_QUOTES]: 'Um evento em cotação só pode ser encerrado ou cancelado.',
  [EVENT_STATUSES.CLOSED]: 'Eventos encerrados não podem mudar de status.',
  [EVENT_STATUSES.CANCELED]: 'Eventos cancelados não podem mudar de status.',
}

// o schema garante o formato; aqui confere se o dia existe (o Date aceita 31/02 e vira 03/03)
function isExistingCalendarDate(isoText) {
  const [year, month, day] = isoText.slice(0, 10).split('-').map(Number)
  const calendarDate = new Date(Date.UTC(year, month - 1, day))
  return calendarDate.getUTCMonth() === month - 1 && calendarDate.getUTCDate() === day
}

export class EventController extends BaseController {
  constructor(context) {
    super(context, 'event_controller')
    this.userRepository = new UserRepository(context)
    this.organizerRepository = new OrganizerRepository(context)
    this.eventRepository = new EventRepository(context)
    this.internalCostRepository = new InternalCostRepository(context)
    this.proposalRepository = new ProposalRepository(context)
    this.supplierEventRepository = new SupplierEventRepository(context)
    this.notifier = new Notifier(context)
  }

  async #getOrganizerByUserKey(userKey) {
    const user = await this.userRepository.getByKey(userKey)
    if (!user) {
      throw new NotFoundUser(userKey)
    }

    const organizer = await this.organizerRepository.getByUserId(user.id)
    if (!organizer) {
      throw new NotFoundOrganizer(userKey)
    }

    return organizer
  }

  #validateDates(startDate, endDate) {
    if (!isExistingCalendarDate(startDate) || !isExistingCalendarDate(endDate)) {
      throw new EventInvalidDate()
    }

    if (new Date(endDate) < new Date(startDate)) {
      throw new EventEndDateBeforeStartDate()
    }
  }

  #validateAudience(minAudience, expectedAudience, maxAudience, venueCapacity) {
    if (expectedAudience < minAudience) {
      throw new EventExpectedAudienceLessThanMin()
    }

    if (maxAudience < expectedAudience) {
      throw new EventMaxAudienceLessThanExpected()
    }

    if (venueCapacity !== null && venueCapacity !== undefined && maxAudience > venueCapacity) {
      throw new EventCapacityLessThanMaxAudience()
    }
  }

  #buildEventFields(payload) {
    return {
      name: payload.name.trim(),
      category: payload.category.trim(),
      description: payload.description?.trim() || null,
      start_date: new Date(payload.start_date),
      end_date: new Date(payload.end_date),
      venue_name: payload.venue_name.trim(),
      address: payload.address.trim(),
      city: payload.city.trim(),
      state: payload.state.toUpperCase().trim(),
      zip_code: payload.zip_code ? TextTools.onlyDigits(payload.zip_code) : null,
      venue_capacity: payload.venue_capacity ?? null,
      min_audience: payload.min_audience,
      expected_audience: payload.expected_audience,
      max_audience: payload.max_audience,
      profit_margin: payload.profit_margin,
      budget_limit: payload.budget_limit ?? null,
    }
  }

  async createEvent(userKey, payload) {
    const organizer = await this.#getOrganizerByUserKey(userKey)

    this.#validateDates(payload.start_date, payload.end_date)
    this.#validateAudience(payload.min_audience, payload.expected_audience, payload.max_audience, payload.venue_capacity)
    ensureAtMostTwoDecimals(payload.budget_limit, 'budget_limit')
    payload.internal_costs?.forEach((cost) => ensureAtMostTwoDecimals(cost.amount, 'internal cost amount'))

    const eventData = {
      ...this.#buildEventFields(payload),
      organizer_id: organizer.id,
      reference_scenario: payload.reference_scenario ?? REFERENCE_SCENARIOS.EXPECTED,
      status: EVENT_STATUSES.DRAFT,
    }

    const internalCosts = (payload.internal_costs ?? []).map((cost) => ({ ...cost, description: cost.description.trim() }))
    const createdEvent = await this.eventRepository.create(eventData, internalCosts)

    await this.session.commit()
    return EventDto.fromModel(createdEvent)
  }

  async getEventsList(userKey, { status, search, limit = 20, page = 0 } = {}) {
    if (status !== undefined && !Object.values(EVENT_STATUSES).includes(status)) {
      throw new InvalidParameter(`The "status" parameter is invalid. Status ${status} does not exist.`)
    }

    const organizer = await this.#getOrganizerByUserKey(userKey)
    const offset = page * limit

    const { events, count } = await this.eventRepository.getByOrganizer(organizer.id, {
      status,
      search,
      limit,
      offset,
    })

    return {
      data: EventDto.fromList(events),
      limit,
      page,
      total: count,
      is_last_page: (page + 1) * limit >= count,
    }
  }

  async getEventByKey(userKey, eventKey) {
    const organizer = await this.#getOrganizerByUserKey(userKey)
    const event = await this.eventRepository.getByKey(eventKey)

    if (!event || event.organizer_id !== organizer.id) {
      throw new NotFoundEvent(eventKey)
    }

    return EventDto.fromModel(event)
  }

  async getEventProposals(userKey, eventKey) {
    const organizer = await this.#getOrganizerByUserKey(userKey)
    const event = await this.eventRepository.getByKey(eventKey)

    if (!event || event.organizer_id !== organizer.id) {
      throw new NotFoundEvent(eventKey)
    }

    return this.#getProposalComparison(event)
  }

  // commit antes de assinar as URLs, para a conexão do banco voltar ao pool enquanto o GCS responde
  async #getProposalComparison(event) {
    const comparisonData = await this.#readProposalComparison(event)
    await this.session.commit()
    return this.#buildProposalComparison(event, comparisonData)
  }

  async #readProposalComparison(event) {
    const rows = await this.proposalRepository.getByEventId(event.id)
    const photos = await this.proposalRepository.getPhotosByEventId(event.id)
    return { rows, photos }
  }

  async #buildProposalComparison(event, { rows, photos }) {
    const photoResponses = await toPhotoResponses(photos)

    const photosByProposalKey = {}
    photos.forEach((photo, index) => {
      photosByProposalKey[photo.proposal_key] ??= []
      photosByProposalKey[photo.proposal_key].push(photoResponses[index])
    })

    return ProposalComparisonDTO.fromRows(event.event_key, rows, photosByProposalKey)
  }

  async acceptProposal(userKey, eventKey, proposalKey) {
    const organizer = await this.#getOrganizerByUserKey(userKey)
    const event = await this.eventRepository.getByKeyForUpdate(eventKey)

    if (!event || event.organizer_id !== organizer.id) {
      throw new NotFoundEvent(eventKey)
    }
    if (event.status !== EVENT_STATUSES.OPEN_FOR_QUOTES) {
      throw new EventNotOpenForQuotes()
    }

    const decision = await this.proposalRepository.acceptByProposalKey(event.id, proposalKey)
    if (!decision) {
      throw new NotFoundProposal(proposalKey)
    }

    // as outras propostas do item são recusadas junto e cada fornecedor recebe a sua notificação
    const parties = await this.proposalRepository.getProposalParties([...decision.acceptedKeys, ...decision.rejectedKeys])
    const pushes = await this.notifier.notify(
      parties.map((party) =>
        decision.acceptedKeys.includes(party.proposal_key)
          ? NotificationDrafts.proposalAccepted(party)
          : NotificationDrafts.proposalRejected(party),
      ),
    )

    // as URLs das fotos são geradas depois do commit, para não segurar o evento travado
    return { comparison: await this.#getProposalComparison(event), pushes }
  }

  async rejectProposal(userKey, eventKey, proposalKey) {
    const organizer = await this.#getOrganizerByUserKey(userKey)
    const event = await this.eventRepository.getByKeyForUpdate(eventKey)

    if (!event || event.organizer_id !== organizer.id) {
      throw new NotFoundEvent(eventKey)
    }
    if (event.status !== EVENT_STATUSES.OPEN_FOR_QUOTES) {
      throw new EventNotOpenForQuotes()
    }

    const rejectedProposal = await this.proposalRepository.rejectByProposalKey(event.id, proposalKey)
    if (!rejectedProposal) {
      throw new NotFoundProposal(proposalKey)
    }

    const parties = await this.proposalRepository.getProposalParties([proposalKey])
    const pushes = await this.notifier.notify(parties.map(NotificationDrafts.proposalRejected))

    const organizerUser = await this.userRepository.getByKey(userKey)
    const email = rejectedProposalEmail(rejectedProposal, event, organizerUser)
    const comparison = await this.#getProposalComparison(event)

    return { comparison, email, pushes }
  }

  async updateEvent(userKey, eventKey, payload) {
    const organizer = await this.#getOrganizerByUserKey(userKey)
    // trava a linha: uma mudança de status ao mesmo tempo não escapa da checagem de status final
    const event = await this.eventRepository.getByKeyForUpdate(eventKey)

    if (!event || event.organizer_id !== organizer.id) {
      throw new NotFoundEvent(eventKey)
    }

    if (isFinalEventStatus(event.status)) {
      throw new EventCannotBeModified(event.status)
    }

    this.#validateDates(payload.start_date, payload.end_date)
    this.#validateAudience(payload.min_audience, payload.expected_audience, payload.max_audience, payload.venue_capacity)
    ensureAtMostTwoDecimals(payload.budget_limit, 'budget_limit')

    const updatedFields = {
      ...this.#buildEventFields(payload),
      reference_scenario: payload.reference_scenario ?? event.reference_scenario,
    }

    const updatedEvent = await this.eventRepository.update(event, updatedFields)
    await this.session.commit()

    return EventDto.fromModel(updatedEvent)
  }

  async updateEventStatus(userKey, eventKey, newStatus, cancellationReason) {
    const organizer = await this.#getOrganizerByUserKey(userKey)
    // trava a linha: duas mudanças ao mesmo tempo não passam juntas pela checagem de transição
    const event = await this.eventRepository.getByKeyForUpdate(eventKey)

    if (!event || event.organizer_id !== organizer.id) {
      throw new NotFoundEvent(eventKey)
    }

    if (newStatus === event.status) {
      throw new EventStatusConflict('O evento já está com esse status.')
    }

    const isAllowedTransition = EVENT_STATUS_TRANSITIONS[event.status]?.includes(newStatus) ?? false
    if (!isAllowedTransition && newStatus === EVENT_STATUSES.OPEN_FOR_QUOTES) {
      throw new EventCannotBePublished(event.status)
    }
    if (!isAllowedTransition) {
      throw new EventStatusConflict(STATUS_CONFLICT_MESSAGES[event.status])
    }

    if (newStatus === EVENT_STATUSES.CLOSED) {
      const items = await this.proposalRepository.getItemsForEventApproval(event.id)
      const pendingItems = items
        .filter((item) => !Boolean(item.has_accepted_proposal))
        .map(({ item_key, description }) => ({ item_key, description }))

      if (items.length === 0 || pendingItems.length > 0) {
        throw new EventHasItemsWithoutAcceptedProposal(pendingItems)
      }
    }

    const isCanceling = newStatus === EVENT_STATUSES.CANCELED
    const reason = isCanceling ? cancellationReason.trim() : null
    const canceledProposals = isCanceling ? await this.#cancelOpenProposals(event.id) : []
    const organizerContact = canceledProposals.length > 0 ? await this.#getOrganizerContact(userKey, organizer) : null
    const updatedEvent = await this.eventRepository.updateStatus(event, newStatus, reason)
    const pushes = await this.notifier.notify(await this.#statusChangeDrafts(updatedEvent, canceledProposals))
    await this.session.commit()

    const emails = canceledProposals.map((proposal) => canceledProposalEmail(proposal, updatedEvent, organizerContact))
    return { event: EventDto.fromModel(updatedEvent), emails, pushes }
  }

  // publicar avisa os fornecedores das categorias dos itens; cancelar avisa quem tinha proposta aberta ou aceita
  async #statusChangeDrafts(event, canceledProposals) {
    if (event.status === EVENT_STATUSES.OPEN_FOR_QUOTES) {
      const suppliers = await this.supplierEventRepository.getSuppliersMatchingEvent(event.id)
      return suppliers.map((supplier) => NotificationDrafts.eventPublished(event, supplier))
    }

    const parties = await this.proposalRepository.getProposalParties(canceledProposals.map((proposal) => proposal.proposal_key))
    return parties.map(NotificationDrafts.eventCanceled)
  }

  async #getOrganizerContact(userKey, organizer) {
    const user = await this.userRepository.getByKey(userKey)
    return { name: user.name, contact: `${user.email} · ${organizer.phone}` }
  }

  async #cancelOpenProposals(eventId) {
    const proposals = await this.proposalRepository.getOpenProposalsOfEventForUpdate(eventId)
    await this.proposalRepository.cancelProposals(proposals.map((proposal) => proposal.id))
    return proposals
  }

  async #getEditableEventForUpdate(userKey, eventKey) {
    const organizer = await this.#getOrganizerByUserKey(userKey)
    const event = await this.eventRepository.getByKeyForUpdate(eventKey)

    if (!event || event.organizer_id !== organizer.id) {
      throw new NotFoundEvent(eventKey)
    }
    if (isFinalEventStatus(event.status)) {
      throw new EventCannotBeModified(event.status)
    }
    return event
  }

  async #getInternalCost(costKey, event) {
    const cost = await this.internalCostRepository.getByKeyInEvent(costKey, event.id)
    if (!cost) {
      throw new NotFoundInternalCost(costKey)
    }
    return cost
  }

  // os três devolvem o evento inteiro, para o total e o ticket já virem recalculados
  async addInternalCost(userKey, eventKey, payload) {
    ensureAtMostTwoDecimals(payload.amount, 'amount')
    const event = await this.#getEditableEventForUpdate(userKey, eventKey)
    await this.internalCostRepository.create(event.id, { ...payload, description: payload.description.trim() })
    return this.#commitAndGetEvent(eventKey)
  }

  async updateInternalCost(userKey, eventKey, costKey, payload) {
    ensureAtMostTwoDecimals(payload.amount, 'amount')
    const event = await this.#getEditableEventForUpdate(userKey, eventKey)
    const cost = await this.#getInternalCost(costKey, event)
    await this.internalCostRepository.update(cost, { ...payload, description: payload.description.trim() })
    return this.#commitAndGetEvent(eventKey)
  }

  async removeInternalCost(userKey, eventKey, costKey) {
    const event = await this.#getEditableEventForUpdate(userKey, eventKey)
    const cost = await this.#getInternalCost(costKey, event)
    await this.internalCostRepository.delete(cost)
    return this.#commitAndGetEvent(eventKey)
  }

  async #commitAndGetEvent(eventKey) {
    const event = await this.eventRepository.getByKey(eventKey)
    await this.session.commit()
    return EventDto.fromModel(event)
  }
}

function canceledProposalEmail(proposal, event, organizer) {
  const wasAccepted = proposal.status === PROPOSAL_STATUSES.ACCEPTED
  const content = EmailTemplates.render('event_canceled', {
    nome: proposal.supplier_name,
    evento: event.name,
    organizador: organizer.name,
    situacao: wasAccepted
      ? 'Sua proposta tinha sido aceita e foi cancelada junto com o evento.'
      : 'Sua proposta ainda aguardava a decisão do organizador e foi cancelada junto com o evento.',
    item: proposal.item_description,
    valor: TextTools.formatCurrency(proposal.amount),
    motivo: event.cancellation_reason,
    // só quem estava com a proposta aceita pode ter tido custo combinado com o organizador
    orientacao: wasAccepted
      ? `Para combinar qualquer custo que você já teve com este evento, fale com o organizador: ${organizer.contact}`
      : 'Como a proposta ainda não tinha sido aceita, você não precisa fazer nada.',
    link: `${FRONT_URL}/fornecedor/propostas/${proposal.proposal_key}`,
  })
  return { to: proposal.supplier_email, ...content }
}

function rejectedProposalEmail(proposal, event, organizer) {
  const content = EmailTemplates.render('proposal_rejected', {
    nome: proposal.supplier_name,
    evento: event.name,
    organizador: organizer.name,
    item: proposal.item_description,
    valor: TextTools.formatCurrency(proposal.amount),
    link: `${FRONT_URL}/fornecedor/propostas/${proposal.proposal_key}`,
  })
  return { to: proposal.supplier_email, ...content }
}
