import { BaseController } from './base_controller.js'
import { EVENT_STATUS_TRANSITIONS, EVENT_STATUSES, REFERENCE_SCENARIOS, isFinalEventStatus } from '../constants.js'
import { EventDto } from '../dtos/event_dto.js'
import {
  EventCannotBeModified,
  EventCannotBePublished,
  EventCapacityLessThanMaxAudience,
  EventEndDateBeforeStartDate,
  EventInvalidDate,
  EventExpectedAudienceLessThanMin,
  EventMaxAudienceLessThanExpected,
  EventStatusConflict,
  InvalidParameter,
  NotFoundEvent,
  NotFoundOrganizer,
  NotFoundUser,
} from '../errors/index.js'
import { EventRepository } from '../repositories/event_repository.js'
import { OrganizerRepository } from '../repositories/organizer_repository.js'
import { UserRepository } from '../repositories/user_repository.js'
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

/**
 * Controller responsável pelas operações de eventos do Organizador (RF05, RF07, RF08).
 * Gerencia validações de negócio, isolamento por organizador e persistência transacional.
 */
export class EventController extends BaseController {
  constructor(context) {
    super(context, 'event_controller')
    this.userRepository = new UserRepository(context)
    this.organizerRepository = new OrganizerRepository(context)
    this.eventRepository = new EventRepository(context)
  }

  /**
   * Obtém o registro de organizador vinculado ao usuário logado.
   * Garante o isolamento de tenant para que o organizador só manipule seus próprios eventos.
   *
   * @param {string} userKey Chave pública do usuário autenticado.
   * @returns {Promise<import('../models/organizer.js').Organizer>}
   */
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

  /**
   * Valida coerência temporal entre início e término do evento.
   */
  #validateDates(startDate, endDate) {
    if (!isExistingCalendarDate(startDate) || !isExistingCalendarDate(endDate)) {
      throw new EventInvalidDate()
    }

    if (new Date(endDate) < new Date(startDate)) {
      throw new EventEndDateBeforeStartDate()
    }
  }

  /**
   * Valida faixas de público mínimo, esperado e máximo, além da capacidade do espaço.
   */
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

  /**
   * Campos que vêm do formulário iguais na criação e na edição, já limpos e normalizados.
   */
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
    }
  }

  /**
   * Cria um novo evento e seus custos próprios iniciais (se informados).
   *
   * @param {string} userKey Chave do organizador.
   * @param {object} payload Dados validados do evento.
   * @returns {Promise<object>} DTO do evento criado.
   */
  async createEvent(userKey, payload) {
    const organizer = await this.#getOrganizerByUserKey(userKey)

    this.#validateDates(payload.start_date, payload.end_date)
    this.#validateAudience(payload.min_audience, payload.expected_audience, payload.max_audience, payload.venue_capacity)

    const eventData = {
      ...this.#buildEventFields(payload),
      organizer_id: organizer.id,
      reference_scenario: payload.reference_scenario ?? REFERENCE_SCENARIOS.EXPECTED,
      status: EVENT_STATUSES.DRAFT,
    }

    const internalCosts = payload.internal_costs ?? []
    const createdEvent = await this.eventRepository.create(eventData, internalCosts)

    await this.session.commit()
    return EventDto.fromModel(createdEvent)
  }

  /**
   * Lista os eventos pertencentes ao organizador logado com filtros e paginação.
   *
   * @param {string} userKey Chave do organizador.
   * @param {object} options Opções de busca e paginação.
   * @returns {Promise<object>} Lista paginada de eventos.
   */
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

  /**
   * Consulta os dados detalhados de um evento pelo seu UUID público.
   *
   * @param {string} userKey Chave do organizador autenticado.
   * @param {string} eventKey UUID do evento.
   * @returns {Promise<object>} DTO detalhado do evento.
   */
  async getEventByKey(userKey, eventKey) {
    const organizer = await this.#getOrganizerByUserKey(userKey)
    const event = await this.eventRepository.getByKey(eventKey)

    if (!event || event.organizer_id !== organizer.id) {
      throw new NotFoundEvent(eventKey)
    }

    return EventDto.fromModel(event)
  }

  /**
   * Atualiza as informações cadastrais e financeiras do evento.
   *
   * @param {string} userKey Chave do organizador autenticado.
   * @param {string} eventKey UUID do evento.
   * @param {object} payload Dados atualizados.
   * @returns {Promise<object>} DTO do evento atualizado.
   */
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

    const updatedFields = {
      ...this.#buildEventFields(payload),
      reference_scenario: payload.reference_scenario ?? event.reference_scenario,
    }

    const updatedEvent = await this.eventRepository.update(event, updatedFields)
    await this.session.commit()

    return EventDto.fromModel(updatedEvent)
  }

  /**
   * Altera o status do evento (ex: de 'draft' para 'open_for_quotes' - RF08).
   *
   * @param {string} userKey Chave do organizador autenticado.
   * @param {string} eventKey UUID do evento.
   * @param {string} newStatus Novo status do evento.
   * @returns {Promise<object>} DTO atualizado.
   */
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
      throw new EventStatusConflict(STATUS_CONFLICT_MESSAGES[event.status] ?? 'O status do evento não pode ser alterado.')
    }

    const reason = newStatus === EVENT_STATUSES.CANCELED ? cancellationReason.trim() : null
    const updatedEvent = await this.eventRepository.updateStatus(event, newStatus, reason)
    await this.session.commit()

    return EventDto.fromModel(updatedEvent)
  }
}
