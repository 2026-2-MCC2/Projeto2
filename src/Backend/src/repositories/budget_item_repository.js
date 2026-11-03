// Consultas e gravações dos itens de custo e de suas categorias.

import { randomUUID } from 'node:crypto'

import { BudgetItem, ItemCategory } from '../models/index.js'

export class BudgetItemRepository {
  constructor(context) {
    this.session = context.dbSession
  }

  async getCategoryByName(categoryName) {
    return ItemCategory.findOne({ where: { name: categoryName }, transaction: this.session })
  }

  async create(eventId, categoryId, fields) {
    const itemKey = randomUUID()
    await BudgetItem.create(
      {
        budget_item_key: itemKey,
        event_id: eventId,
        category_id: categoryId,
        ...fields,
        created_at: new Date(),
      },
      { transaction: this.session },
    )

    return this.getByKeyInEvent(itemKey, eventId)
  }

  async getByKeyInEvent(itemKey, eventId) {
    return BudgetItem.findOne({
      where: { budget_item_key: itemKey, event_id: eventId },
      include: [{ association: 'category' }],
      transaction: this.session,
    })
  }
}
