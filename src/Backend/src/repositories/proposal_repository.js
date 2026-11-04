// Consulta propostas recebidas para os itens de um evento.

import { QueryTypes } from 'sequelize'

import { sequelize } from '../connectors/database_connector.js'
import { ProposalDecisionConflict, ProposalExpired } from '../errors/index.js'

export class ProposalRepository {
  constructor(context) {
    this.session = context.dbSession
  }

  async getByEventId(eventId) {
    return sequelize.query(
      `SELECT budget_item.budget_item_key, budget_item.description AS item_description,
              proposal.proposal_key, supplier_user.name AS supplier_name, proposal.amount,
              DATE_FORMAT(proposal.valid_until, '%Y-%m-%d') AS valid_until, proposal.notes, proposal.status,
              CASE WHEN proposal.valid_until < UTC_DATE() THEN TRUE ELSE FALSE END AS is_expired,
              (SELECT COALESCE(SUM(internal_cost.amount), 0)
               FROM internal_cost WHERE internal_cost.event_id = event.id) +
              (SELECT COALESCE(SUM(accepted_proposal.amount), 0)
               FROM budget_item AS accepted_item
               INNER JOIN proposal AS accepted_proposal ON accepted_proposal.budget_item_id = accepted_item.id
               WHERE accepted_item.event_id = event.id AND accepted_proposal.status = 'accepted') AS total_cost
       FROM event
       LEFT JOIN budget_item ON budget_item.event_id = event.id
       LEFT JOIN proposal ON proposal.budget_item_id = budget_item.id
       LEFT JOIN supplier ON supplier.id = proposal.supplier_id
       LEFT JOIN user AS supplier_user ON supplier_user.id = supplier.user_id
       WHERE event.id = :eventId
       ORDER BY budget_item.created_at ASC, budget_item.id ASC,
                proposal.amount ASC, proposal.id ASC`,
      { replacements: { eventId }, transaction: this.session, type: QueryTypes.SELECT },
    )
  }

  async acceptByProposalKey(eventId, proposalKey) {
    const proposalReferences = await sequelize.query(
      `SELECT budget_item.id AS budget_item_id, proposal.status AS initial_status
       FROM proposal
       INNER JOIN budget_item ON budget_item.id = proposal.budget_item_id
       WHERE budget_item.event_id = :eventId AND proposal.proposal_key = :proposalKey
       LIMIT 1`,
      { replacements: { eventId, proposalKey }, transaction: this.session, type: QueryTypes.SELECT },
    )
    const proposalReference = proposalReferences[0]
    const budgetItemId = proposalReference?.budget_item_id
    if (budgetItemId === undefined) return false

    const lockedItems = await sequelize.query(`SELECT id FROM budget_item WHERE id = :budgetItemId AND event_id = :eventId FOR UPDATE`, {
      replacements: { budgetItemId, eventId },
      transaction: this.session,
      type: QueryTypes.SELECT,
    })
    if (lockedItems.length === 0) return false

    const proposals = await sequelize.query(
      `SELECT proposal_key, status,
              CASE WHEN valid_until < UTC_DATE() THEN TRUE ELSE FALSE END AS is_expired
       FROM proposal
       WHERE budget_item_id = :budgetItemId
       ORDER BY id ASC
       FOR UPDATE`,
      { replacements: { budgetItemId }, transaction: this.session, type: QueryTypes.SELECT },
    )
    const proposal = proposals.find((candidate) => candidate.proposal_key === proposalKey)
    if (!proposal) return false
    if (proposal.status !== proposalReference.initial_status) throw new ProposalDecisionConflict()
    if (Boolean(proposal.is_expired)) throw new ProposalExpired()

    await sequelize.query(
      `UPDATE proposal
       SET status = CASE WHEN proposal_key = :proposalKey THEN 'accepted' ELSE 'rejected' END,
           selected = CASE WHEN proposal_key = :proposalKey THEN TRUE ELSE FALSE END
       WHERE budget_item_id = :budgetItemId`,
      { replacements: { proposalKey, budgetItemId }, transaction: this.session },
    )

    return true
  }
}
