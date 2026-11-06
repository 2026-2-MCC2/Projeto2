import { randomUUID } from 'node:crypto'
import { QueryTypes } from 'sequelize'

import { BudgetItem, ItemCategory } from '../models/index.js'
import { sequelize } from '../connectors/database_connector.js'

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

  async getByKeyInEvent(itemKey, eventId, { lock = false } = {}) {
    const options = {
      where: { budget_item_key: itemKey, event_id: eventId },
      include: [{ association: 'category' }],
      transaction: this.session,
    }
    if (lock) {
      options.lock = this.session.LOCK.UPDATE
    }
    return BudgetItem.findOne(options)
  }

  // FOR SHARE enxerga a proposta confirmada enquanto a edição esperava a trava do item; com a leitura
  // comum, o item seria apagado e o ON DELETE CASCADE levaria a proposta junto
  async hasProposals(itemId) {
    const proposals = await sequelize.query('SELECT 1 FROM proposal WHERE budget_item_id = ? LIMIT 1 FOR SHARE', {
      replacements: [itemId],
      transaction: this.session,
      type: QueryTypes.SELECT,
    })
    return proposals.length > 0
  }

  async update(item, categoryId, fields) {
    item.set({ category_id: categoryId, ...fields })
    await item.save({ transaction: this.session })
    return this.getByKeyInEvent(item.budget_item_key, item.event_id)
  }

  async delete(item) {
    await item.destroy({ transaction: this.session })
  }

  async getByEventId(eventId) {
    return sequelize.query(
      `SELECT budget_item.budget_item_key, item_category.name AS category, budget_item.description,
              budget_item.type, budget_item.quantity, budget_item.estimated_value, budget_item.notes,
              (SELECT COUNT(*) FROM proposal WHERE proposal.budget_item_id = budget_item.id) AS proposals_count,
              (SELECT JSON_OBJECT('proposal_key', proposal.proposal_key, 'amount', proposal.amount)
               FROM proposal
               WHERE proposal.budget_item_id = budget_item.id AND proposal.status = 'accepted'
               ORDER BY proposal.id DESC LIMIT 1) AS accepted_proposal
       FROM budget_item
       INNER JOIN item_category ON item_category.id = budget_item.category_id
       WHERE budget_item.event_id = ?
       ORDER BY budget_item.created_at ASC, budget_item.id ASC`,
      { replacements: [eventId], transaction: this.session, type: QueryTypes.SELECT },
    )
  }
}
