// Consulta propostas recebidas para os itens de um evento.

import { QueryTypes } from 'sequelize'

import { sequelize } from '../connectors/database_connector.js'

export class ProposalRepository {
  constructor(context) {
    this.session = context.dbSession
  }

  async getByEventId(eventId) {
    return sequelize.query(
      `SELECT budget_item.budget_item_key, budget_item.description AS item_description,
              proposal.proposal_key, supplier_user.name AS supplier_name, proposal.amount,
              DATE_FORMAT(proposal.valid_until, '%Y-%m-%d') AS valid_until, proposal.notes,
              CASE WHEN proposal.valid_until < UTC_DATE() THEN TRUE ELSE FALSE END AS is_expired
       FROM budget_item
       LEFT JOIN proposal ON proposal.budget_item_id = budget_item.id
       LEFT JOIN supplier ON supplier.id = proposal.supplier_id
       LEFT JOIN user AS supplier_user ON supplier_user.id = supplier.user_id
       WHERE budget_item.event_id = :eventId
       ORDER BY budget_item.created_at ASC, budget_item.id ASC,
                proposal.amount ASC, proposal.id ASC`,
      { replacements: { eventId }, transaction: this.session, type: QueryTypes.SELECT },
    )
  }
}
