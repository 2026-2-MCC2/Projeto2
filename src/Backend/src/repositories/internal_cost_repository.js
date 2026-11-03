import { randomUUID } from 'node:crypto'

import { InternalCost } from '../models/index.js'

export class InternalCostRepository {
  constructor(context) {
    this.session = context.dbSession
  }

  async create(eventId, { type, description, amount }) {
    return InternalCost.create(
      {
        internal_cost_key: randomUUID(),
        event_id: eventId,
        type: type,
        description: description,
        amount: amount,
        created_at: new Date(),
      },
      { transaction: this.session },
    )
  }

  // a chave só vale dentro do evento: o custo de outro evento não é encontrado
  async getByKeyInEvent(costKey, eventId) {
    return InternalCost.findOne({
      where: { internal_cost_key: costKey, event_id: eventId },
      transaction: this.session,
    })
  }

  async update(cost, { type, description, amount }) {
    cost.set({ type, description, amount })
    await cost.save({ transaction: this.session })
  }

  async delete(cost) {
    await cost.destroy({ transaction: this.session })
  }
}
