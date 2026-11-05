import { QueryTypes } from 'sequelize'

import { sequelize } from '../connectors/database_connector.js'

const SORT_COLUMNS = Object.freeze({
  start_date: 'e.start_date',
  name: 'e.name',
  status: 'e.status',
  created_at: 'e.created_at',
})

// a proposta cancelada continua com selected = TRUE (é o que libera o contato do organizador para o
// fornecedor que estava aceito), mas não é mais gasto do evento
const IS_SELECTED_PROPOSAL = "(proposal.selected = TRUE OR proposal.status = 'accepted') AND proposal.status <> 'canceled'"

export class AdminReportRepository {
  constructor(context) {
    this.session = context.dbSession
  }

  async getReportPage(params) {
    const { where, replacements } = eventFilter(params)
    const registrationStatuses = await this.getRegistrationStatuses()
    const eventStatuses = await this.getEventStatuses(where, replacements)
    const proposalStatuses = await this.getProposalStatuses(where, replacements)
    const totals = await this.getTotals(where, replacements)

    const orderBy = SORT_COLUMNS[params.sort]
    const direction = params.order.toUpperCase()
    const events = await sequelize.query(
      `SELECT e.event_key, e.name, e.start_date, e.end_date, e.status,
              e.min_audience, e.expected_audience, e.max_audience, e.profit_margin,
              e.reference_scenario, organizer_user.user_key AS organizer_key,
              organizer_user.name AS organizer_name,
              COALESCE(estimated.estimated_items_total, 0) AS estimated_items_total,
              COALESCE(internal_costs.internal_cost_total, 0) AS internal_cost_total,
              COALESCE(proposals.proposal_count, 0) AS proposal_count,
              COALESCE(proposals.sent_count, 0) AS sent_proposal_count,
              COALESCE(proposals.review_count, 0) AS review_proposal_count,
              COALESCE(proposals.accepted_count, 0) AS accepted_proposal_count,
              COALESCE(proposals.rejected_count, 0) AS rejected_proposal_count,
              COALESCE(proposals.selected_total, 0) AS selected_proposals_total,
              COALESCE(planning.planning_cost_total, 0) AS planning_cost_total,
              COALESCE(planning.incomplete_budget_item_count, 0) AS incomplete_budget_item_count
       FROM event AS e
       INNER JOIN organizer ON organizer.id = e.organizer_id
       INNER JOIN user AS organizer_user ON organizer_user.id = organizer.user_id
       LEFT JOIN (
         SELECT budget_item.event_id,
                SUM(budget_item.estimated_value * budget_item.quantity) AS estimated_items_total
         FROM budget_item
         WHERE budget_item.estimated_value IS NOT NULL
         GROUP BY budget_item.event_id
       ) AS estimated ON estimated.event_id = e.id
       LEFT JOIN (
         SELECT internal_cost.event_id, SUM(internal_cost.amount) AS internal_cost_total
         FROM internal_cost
         GROUP BY internal_cost.event_id
       ) AS internal_costs ON internal_costs.event_id = e.id
       LEFT JOIN (
         SELECT budget_item.event_id,
                COUNT(proposal.id) AS proposal_count,
                SUM(proposal.status = 'sent') AS sent_count,
                SUM(proposal.status = 'under_review') AS review_count,
                SUM(proposal.status = 'accepted') AS accepted_count,
                SUM(proposal.status = 'rejected') AS rejected_count,
                SUM(CASE WHEN ${IS_SELECTED_PROPOSAL}
                         THEN proposal.amount ELSE 0 END) AS selected_total
         FROM budget_item
         INNER JOIN proposal ON proposal.budget_item_id = budget_item.id
         GROUP BY budget_item.event_id
       ) AS proposals ON proposals.event_id = e.id
       LEFT JOIN (
         SELECT budget_item.event_id,
                SUM(CASE WHEN selected_for_item.selected_amount IS NOT NULL
                         THEN selected_for_item.selected_amount
                         ELSE COALESCE(budget_item.estimated_value, 0) * budget_item.quantity END) AS planning_cost_total,
                SUM(CASE WHEN selected_for_item.selected_amount IS NULL
                              AND budget_item.estimated_value IS NULL
                         THEN 1 ELSE 0 END) AS incomplete_budget_item_count
         FROM budget_item
         LEFT JOIN (
           SELECT proposal.budget_item_id, SUM(proposal.amount) AS selected_amount
           FROM proposal
           WHERE ${IS_SELECTED_PROPOSAL}
           GROUP BY proposal.budget_item_id
         ) AS selected_for_item ON selected_for_item.budget_item_id = budget_item.id
         GROUP BY budget_item.event_id
       ) AS planning ON planning.event_id = e.id
       ${where}
       ORDER BY ${orderBy} ${direction}, e.id ${direction}
       LIMIT :rowLimit OFFSET :offset`,
      {
        replacements: { ...replacements, rowLimit: params.limit + 1, offset: params.offset },
        type: QueryTypes.SELECT,
        transaction: this.session,
      },
    )

    const isLastPage = events.length <= params.limit
    if (!isLastPage) events.pop()

    return {
      registrationStatuses: registrationStatuses,
      eventStatuses: eventStatuses,
      proposalStatuses: proposalStatuses,
      totals: totals,
      events: events,
      isLastPage: isLastPage,
    }
  }

  async getRegistrationStatuses() {
    return sequelize.query(
      `SELECT profile, status, COUNT(*) AS total
       FROM user
       WHERE profile IN ('organizador', 'fornecedor')
       GROUP BY profile, status`,
      { type: QueryTypes.SELECT, transaction: this.session },
    )
  }

  async getEventStatuses(where, replacements) {
    return sequelize.query(
      `SELECT e.status, COUNT(*) AS total
       FROM event AS e
       INNER JOIN organizer ON organizer.id = e.organizer_id
       INNER JOIN user AS organizer_user ON organizer_user.id = organizer.user_id
       ${where}
       GROUP BY e.status`,
      { replacements: replacements, type: QueryTypes.SELECT, transaction: this.session },
    )
  }

  async getProposalStatuses(where, replacements) {
    return sequelize.query(
      `SELECT proposal.status, COUNT(*) AS total
       FROM proposal
       INNER JOIN budget_item ON budget_item.id = proposal.budget_item_id
       INNER JOIN event AS e ON e.id = budget_item.event_id
       INNER JOIN organizer ON organizer.id = e.organizer_id
       INNER JOIN user AS organizer_user ON organizer_user.id = organizer.user_id
       ${where}
       GROUP BY proposal.status`,
      { replacements: replacements, type: QueryTypes.SELECT, transaction: this.session },
    )
  }

  async getTotals(where, replacements) {
    const [totals] = await sequelize.query(
      `SELECT
         (SELECT COALESCE(SUM(budget_item.estimated_value * budget_item.quantity), 0)
          FROM budget_item
          INNER JOIN event AS e ON e.id = budget_item.event_id
          INNER JOIN organizer ON organizer.id = e.organizer_id
          INNER JOIN user AS organizer_user ON organizer_user.id = organizer.user_id
          ${where} AND budget_item.estimated_value IS NOT NULL) AS estimated_items_total,
         (SELECT COALESCE(SUM(internal_cost.amount), 0)
          FROM internal_cost
          INNER JOIN event AS e ON e.id = internal_cost.event_id
          INNER JOIN organizer ON organizer.id = e.organizer_id
          INNER JOIN user AS organizer_user ON organizer_user.id = organizer.user_id
          ${where}) AS internal_cost_total,
         (SELECT COALESCE(SUM(proposal.amount), 0)
          FROM proposal
          INNER JOIN budget_item ON budget_item.id = proposal.budget_item_id
          INNER JOIN event AS e ON e.id = budget_item.event_id
          INNER JOIN organizer ON organizer.id = e.organizer_id
          INNER JOIN user AS organizer_user ON organizer_user.id = organizer.user_id
          WHERE ${IS_SELECTED_PROPOSAL} AND ${where.slice('WHERE '.length)}) AS selected_proposals_total`,
      { replacements: replacements, type: QueryTypes.SELECT, transaction: this.session },
    )

    return totals
  }
}

function eventFilter(params) {
  const conditions = []
  const replacements = {}

  if (params.eventKey !== undefined) {
    conditions.push('e.event_key = :eventKey')
    replacements.eventKey = params.eventKey
  }
  if (params.organizerKey !== undefined) {
    conditions.push('organizer_user.user_key = :organizerKey')
    replacements.organizerKey = params.organizerKey
  }
  if (params.eventName !== undefined) {
    conditions.push('LOCATE(LOWER(:eventName), LOWER(e.name)) > 0')
    replacements.eventName = params.eventName
  }
  if (params.organizerName !== undefined) {
    conditions.push('LOCATE(LOWER(:organizerName), LOWER(organizer_user.name)) > 0')
    replacements.organizerName = params.organizerName
  }
  // start_date fica em UTC; o período escolhido pelo admin é em dias de Brasília (sem horário de verão desde 2019)
  if (params.from !== undefined) {
    conditions.push("DATE(CONVERT_TZ(e.start_date, '+00:00', '-03:00')) BETWEEN :fromDate AND :toDate")
    replacements.fromDate = params.from
    replacements.toDate = params.to
  }

  return {
    where: `WHERE 1 = 1${conditions.length ? ` AND ${conditions.join(' AND ')}` : ''}`,
    replacements: replacements,
  }
}
