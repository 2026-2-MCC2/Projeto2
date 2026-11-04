import { randomUUID } from 'node:crypto'
import { Op, QueryTypes } from 'sequelize'

import { sequelize } from '../connectors/database_connector.js'
import { Event, InternalCost } from '../models/index.js'

export class EventRepository {
  constructor(context) {
    this.session = context.dbSession
  }

  async create(eventData, internalCosts = []) {
    const eventKey = randomUUID()

    const event = await Event.create(
      {
        ...eventData,
        event_key: eventKey,
        created_at: new Date(),
      },
      { transaction: this.session },
    )

    if (internalCosts.length > 0) {
      const costsToCreate = internalCosts.map((cost) => ({
        internal_cost_key: randomUUID(),
        event_id: event.id,
        type: cost.type,
        description: cost.description,
        amount: cost.amount,
        created_at: new Date(),
      }))

      await InternalCost.bulkCreate(costsToCreate, { transaction: this.session })
    }

    return this.getByKey(eventKey)
  }

  async getByKey(eventKey) {
    const event = await Event.findOne({
      where: { event_key: eventKey },
      include: [{ association: 'internal_costs' }],
      transaction: this.session,
    })

    if (!event) return null

    const [totals] = await sequelize.query(
      `SELECT (SELECT COALESCE(SUM(accepted_proposal.amount), 0)
              FROM budget_item AS accepted_item
              INNER JOIN proposal AS accepted_proposal ON accepted_proposal.budget_item_id = accepted_item.id
              WHERE accepted_item.event_id = event.id AND accepted_proposal.status = 'accepted') AS total_accepted_proposals
       FROM event WHERE event.id = :eventId`,
      { replacements: { eventId: event.id }, transaction: this.session, type: QueryTypes.SELECT },
    )

    event.setDataValue('total_accepted_proposals', Number(totals.total_accepted_proposals))
    return event
  }

  async getByKeyForUpdate(eventKey) {
    return Event.findOne({
      where: { event_key: eventKey },
      lock: this.session.LOCK.UPDATE,
      transaction: this.session,
    })
  }

  async getByOrganizer(organizerId, { status, search, limit = 20, offset = 0 } = {}) {
    const where = { organizer_id: organizerId }

    if (status) {
      where.status = status
    }

    if (search && search.trim() !== '') {
      const term = `%${escapeLikeWildcards(search.trim())}%`
      where[Op.or] = [{ name: { [Op.like]: term } }, { venue_name: { [Op.like]: term } }, { city: { [Op.like]: term } }]
    }

    const { rows, count } = await Event.findAndCountAll({
      where,
      include: [{ association: 'internal_costs' }],
      order: [
        ['created_at', 'DESC'],
        ['id', 'DESC'],
      ],
      limit,
      offset,
      distinct: true,
      transaction: this.session,
    })

    return { events: rows, count }
  }

  async update(event, updatedFields) {
    event.set(updatedFields)
    await event.save({ transaction: this.session })
    return this.getByKey(event.event_key)
  }

  async updateStatus(event, newStatus, cancellationReason = null) {
    event.status = newStatus
    event.cancellation_reason = cancellationReason
    await event.save({ transaction: this.session })
    return this.getByKey(event.event_key)
  }
}

// % e _ digitados na busca são texto, não curingas do LIKE
function escapeLikeWildcards(text) {
  return text.replace(/[\\%_]/g, '\\$&')
}
