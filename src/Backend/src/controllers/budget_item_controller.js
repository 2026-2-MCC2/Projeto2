// Regras de negócio para cadastrar itens de custo nos eventos do Organizador.

import { EVENT_STATUSES, isFinalEventStatus } from '../constants.js'
import { BudgetItemDTO } from '../dtos/budget_item_dto.js'
import { EventCannotBeModified, InvalidParameter, NotFoundEvent, NotFoundOrganizer, NotFoundUser } from '../errors/index.js'
import { BudgetItemRepository } from '../repositories/budget_item_repository.js'
import { EventRepository } from '../repositories/event_repository.js'
import { OrganizerRepository } from '../repositories/organizer_repository.js'
import { UserRepository } from '../repositories/user_repository.js'
import { BaseController } from './base_controller.js'

export class BudgetItemController extends BaseController {
  constructor(context) {
    super(context, 'BudgetItemController')
    this.userRepository = new UserRepository(context)
    this.organizerRepository = new OrganizerRepository(context)
    this.eventRepository = new EventRepository(context)
    this.budgetItemRepository = new BudgetItemRepository(context)
  }

  async createItem(userKey, eventKey, payload) {
    const event = await this.#getOwnedEvent(userKey, eventKey, { lock: true })
    this.#ensureEventAllowsItemChanges(event.status)

    const category = await this.budgetItemRepository.getCategoryByName(payload.category)
    if (!category) {
      throw new InvalidParameter(`The item category ${payload.category} does not exist.`)
    }

    const item = await this.budgetItemRepository.create(event.id, category.id, {
      description: payload.description.trim(),
      type: payload.type,
      quantity: payload.quantity,
      estimated_value: payload.estimated_value ?? null,
      notes: payload.notes?.trim() || null,
    })

    await this.session.commit()
    return BudgetItemDTO.fromModel(item)
  }

  async #getOwnedEvent(userKey, eventKey, { lock = false } = {}) {
    const user = await this.userRepository.getByKey(userKey)
    if (!user) {
      throw new NotFoundUser(userKey)
    }

    const organizer = await this.organizerRepository.getByUserId(user.id)
    if (!organizer) {
      throw new NotFoundOrganizer(userKey)
    }

    const event = lock ? await this.eventRepository.getByKeyForUpdate(eventKey) : await this.eventRepository.getByKey(eventKey)
    if (!event || event.organizer_id !== organizer.id) {
      throw new NotFoundEvent(eventKey)
    }

    return event
  }

  #ensureEventAllowsItemChanges(status) {
    const isEditableStatus = [EVENT_STATUSES.DRAFT, EVENT_STATUSES.OPEN_FOR_QUOTES].includes(status)
    if (isFinalEventStatus(status) || !isEditableStatus) {
      throw new EventCannotBeModified(status)
    }
  }
}
