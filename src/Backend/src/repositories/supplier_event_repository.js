// Consultas dos eventos e itens que um fornecedor pode acessar por categoria.

import { QueryTypes } from 'sequelize'

import { sequelize } from '../connectors/database_connector.js'

export class SupplierEventRepository {
  constructor(context) {
    this.session = context.dbSession
  }

  async getAvailableEvents(supplierId, { search, limit, offset }) {
    const searchText = search?.trim() ?? ''
    const searchPattern = searchText ? `%${escapeLikeWildcards(searchText)}%` : null
    const replacements = {
      supplierId,
      searchPattern,
      limit,
      offset,
    }

    const [countResult] = await sequelize.query(
      `SELECT COUNT(DISTINCT event.id) AS total
       FROM event
       INNER JOIN budget_item ON budget_item.event_id = event.id
       INNER JOIN supplier_category ON supplier_category.category_id = budget_item.category_id
       WHERE supplier_category.supplier_id = :supplierId
         AND event.status = 'open_for_quotes'
         AND (:searchPattern IS NULL OR event.name LIKE :searchPattern
              OR event.venue_name LIKE :searchPattern OR event.city LIKE :searchPattern)`,
      { replacements, transaction: this.session, type: QueryTypes.SELECT },
    )

    const events = await sequelize.query(
      `SELECT event.event_key, event.name, event.category, event.description,
              event.start_date, event.end_date, event.venue_name, event.city, event.state,
              event.min_audience, event.expected_audience, event.max_audience,
              COUNT(DISTINCT budget_item.id) AS items_count,
              GROUP_CONCAT(DISTINCT item_category.name ORDER BY item_category.name SEPARATOR '|') AS categories
       FROM event
       INNER JOIN budget_item ON budget_item.event_id = event.id
       INNER JOIN item_category ON item_category.id = budget_item.category_id
       INNER JOIN supplier_category ON supplier_category.category_id = item_category.id
       WHERE supplier_category.supplier_id = :supplierId
         AND event.status = 'open_for_quotes'
         AND (:searchPattern IS NULL OR event.name LIKE :searchPattern
              OR event.venue_name LIKE :searchPattern OR event.city LIKE :searchPattern)
       GROUP BY event.id
       ORDER BY event.created_at DESC, event.id DESC
       LIMIT :limit OFFSET :offset`,
      { replacements, transaction: this.session, type: QueryTypes.SELECT },
    )

    return { events, total: Number(countResult.total) }
  }

  // lock: trava o evento (FOR SHARE) até o commit, para ele não sair de cotação no meio do envio da proposta
  async getAvailableEvent(supplierId, eventKey, { lock = false } = {}) {
    const events = await sequelize.query(
      `SELECT event.id, event.event_key, event.name, event.category, event.description,
              event.start_date, event.end_date, event.venue_name, event.address,
              event.city, event.state, event.min_audience, event.expected_audience,
              event.max_audience, event.status
       FROM event
       WHERE event.event_key = ?
         AND event.status = 'open_for_quotes'
         AND EXISTS (
           SELECT 1
           FROM budget_item
           INNER JOIN supplier_category ON supplier_category.category_id = budget_item.category_id
           WHERE budget_item.event_id = event.id AND supplier_category.supplier_id = ?
         )${lock ? ' FOR SHARE' : ''}`,
      { replacements: [eventKey, supplierId], transaction: this.session, type: QueryTypes.SELECT },
    )
    return events[0] ?? null
  }

  // status e fim do evento de uma proposta, travado (FOR SHARE) para ele não sair de cotação
  // enquanto a proposta é editada ou retirada
  async getEventForShare(eventId) {
    const events = await sequelize.query(`SELECT id, status, end_date FROM event WHERE id = :eventId FOR SHARE`, {
      replacements: { eventId },
      transaction: this.session,
      type: QueryTypes.SELECT,
    })
    return events[0] ?? null
  }

  // item do evento numa categoria que o fornecedor atende; travado (FOR SHARE) para o organizador
  // não editar ou apagar o item enquanto a proposta é gravada
  async getAvailableItem(eventId, supplierId, itemKey) {
    const items = await sequelize.query(
      `SELECT budget_item.id, budget_item.budget_item_key AS item_key
       FROM budget_item
       INNER JOIN supplier_category ON supplier_category.category_id = budget_item.category_id
       WHERE budget_item.budget_item_key = :itemKey
         AND budget_item.event_id = :eventId
         AND supplier_category.supplier_id = :supplierId
       FOR SHARE`,
      { replacements: { itemKey, eventId, supplierId }, transaction: this.session, type: QueryTypes.SELECT },
    )
    return items[0] ?? null
  }

  async getAvailableItems(eventId, supplierId) {
    return sequelize.query(
      `SELECT budget_item.budget_item_key AS item_key, item_category.name AS category,
              budget_item.description, budget_item.type, budget_item.quantity,
              budget_item.estimated_value, budget_item.notes,
              my_proposal.proposal_key, my_proposal.status AS proposal_status,
              my_proposal.amount AS proposal_amount, my_proposal.valid_until AS proposal_valid_until
       FROM budget_item
       INNER JOIN item_category ON item_category.id = budget_item.category_id
       INNER JOIN supplier_category ON supplier_category.category_id = item_category.id
       LEFT JOIN proposal AS my_proposal
         ON my_proposal.budget_item_id = budget_item.id AND my_proposal.supplier_id = :supplierId
       WHERE budget_item.event_id = :eventId AND supplier_category.supplier_id = :supplierId
       ORDER BY budget_item.created_at ASC, budget_item.id ASC`,
      { replacements: { eventId, supplierId }, transaction: this.session, type: QueryTypes.SELECT },
    )
  }
}

function escapeLikeWildcards(text) {
  return text.replace(/[\\%_]/g, '\\$&')
}
