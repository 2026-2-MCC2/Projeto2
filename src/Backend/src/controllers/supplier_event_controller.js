// Regras de acesso e composição das respostas dos eventos visíveis para fornecedores.

import { NotFoundEvent } from '../errors/index.js'
import { SupplierEventRepository } from '../repositories/supplier_event_repository.js'
import { UserRepository } from '../repositories/user_repository.js'
import { BaseController } from './base_controller.js'
import { getSupplierOfUser } from './supplier_access.js'
import { SupplierEventDto } from '../dtos/supplier_event_dto.js'

export class SupplierEventController extends BaseController {
  constructor(context) {
    super(context, 'SupplierEventController')
    this.userRepository = new UserRepository(context)
    this.supplierEventRepository = new SupplierEventRepository(context)
  }

  async getAvailableEvents(userKey, { search, limit, page }) {
    const supplier = await getSupplierOfUser(this.userRepository, userKey)
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
    const supplier = await getSupplierOfUser(this.userRepository, userKey)
    const event = await this.supplierEventRepository.getAvailableEvent(supplier.id, eventKey)
    if (!event) {
      throw new NotFoundEvent(eventKey)
    }

    const items = await this.supplierEventRepository.getAvailableItems(event.id, supplier.id)
    return SupplierEventDto.fromDetail(event, items)
  }
}
