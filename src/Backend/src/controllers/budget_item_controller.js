// Regras de negócio para cadastrar itens de custo nos eventos do Organizador.

import { EVENT_STATUSES } from '../constants.js'
import { BudgetItemDTO } from '../dtos/budget_item_dto.js'
import {
  BudgetItemLocked,
  EventCannotBeModified,
  InvalidSchema,
  NotFoundBudgetItem,
  NotFoundEvent,
  NotFoundOrganizer,
  NotFoundUser,
} from '../errors/index.js'
import { BudgetItemRepository } from '../repositories/budget_item_repository.js'
import { EventRepository } from '../repositories/event_repository.js'
import { OrganizerRepository } from '../repositories/organizer_repository.js'
import { UserRepository } from '../repositories/user_repository.js'
import { ensureAtMostTwoDecimals } from '../utils/money_tools.js'
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
    ensureAtMostTwoDecimals(payload.estimated_value, 'estimated_value')
    const event = await this.#getOwnedEvent(userKey, eventKey, { lock: true })
    this.#ensureEventAllowsItemChanges(event.status)

    const category = await this.budgetItemRepository.getCategoryByName(payload.category)
    if (!category) {
      throw new InvalidSchema(`The item category ${payload.category} does not exist.`, 'Escolha uma das categorias de item da lista.')
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

  async getItems(userKey, eventKey) {
    const event = await this.#getOwnedEvent(userKey, eventKey)
    const items = await this.budgetItemRepository.getByEventId(event.id)
    return BudgetItemDTO.fromList(items)
  }

  async updateItem(userKey, eventKey, itemKey, payload) {
    ensureAtMostTwoDecimals(payload.estimated_value, 'estimated_value')
    const event = await this.#getOwnedEvent(userKey, eventKey, { lock: true })
    this.#ensureEventAllowsItemChanges(event.status)

    const item = await this.budgetItemRepository.getByKeyInEvent(itemKey, event.id, { lock: true })
    if (!item) {
      throw new NotFoundBudgetItem(itemKey)
    }
    if (await this.budgetItemRepository.hasProposals(item.id)) {
      throw new BudgetItemLocked(itemKey)
    }

    const category = await this.budgetItemRepository.getCategoryByName(payload.category)
    if (!category) {
      throw new InvalidSchema(`The item category ${payload.category} does not exist.`, 'Escolha uma das categorias de item da lista.')
    }

    const updatedItem = await this.budgetItemRepository.update(item, category.id, {
      description: payload.description.trim(),
      type: payload.type,
      quantity: payload.quantity,
      estimated_value: payload.estimated_value ?? null,
      notes: payload.notes?.trim() || null,
    })

    await this.session.commit()
    return BudgetItemDTO.fromModel(updatedItem)
  }

  async deleteItem(userKey, eventKey, itemKey) {
    const event = await this.#getOwnedEvent(userKey, eventKey, { lock: true })
    this.#ensureEventAllowsItemChanges(event.status)

    const item = await this.budgetItemRepository.getByKeyInEvent(itemKey, event.id, { lock: true })
    if (!item) {
      throw new NotFoundBudgetItem(itemKey)
    }
    if (await this.budgetItemRepository.hasProposals(item.id)) {
      throw new BudgetItemLocked(itemKey)
    }

    await this.budgetItemRepository.delete(item)
    await this.session.commit()
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
    if (!isEditableStatus) {
      throw new EventCannotBeModified(status)
    }
  }
}
