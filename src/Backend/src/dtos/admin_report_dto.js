function countStatuses(statuses) {
  return statuses.map(({ profile, status, total }) => ({
    ...(profile !== undefined && { profile: profile }),
    status: status,
    total: Number(total),
  }))
}

export class AdminReportDTO {
  static response(report, { limit, page }) {
    return {
      summary: {
        registration_statuses: countStatuses(report.registrationStatuses),
        event_statuses: countStatuses(report.eventStatuses),
        proposal_statuses: countStatuses(report.proposalStatuses),
        values: {
          estimated_items_total: String(report.totals.estimated_items_total),
          internal_cost_total: String(report.totals.internal_cost_total),
          selected_proposals_total: String(report.totals.selected_proposals_total),
        },
      },
      data: report.events.map((event) => AdminReportDTO.event(event)),
      limit: limit,
      page: page,
      is_last_page: report.isLastPage,
    }
  }

  static event(event) {
    return {
      event_key: event.event_key,
      name: event.name,
      start_date: event.start_date,
      end_date: event.end_date,
      status: event.status,
      organizer: {
        user_key: event.organizer_key,
        name: event.organizer_name,
      },
      audience: {
        minimum: Number(event.min_audience),
        expected: Number(event.expected_audience),
        maximum: Number(event.max_audience),
      },
      profit_margin: String(event.profit_margin),
      reference_scenario: event.reference_scenario,
      proposal_count: Number(event.proposal_count),
      proposal_statuses: {
        sent: Number(event.sent_proposal_count),
        under_review: Number(event.review_proposal_count),
        accepted: Number(event.accepted_proposal_count),
        rejected: Number(event.rejected_proposal_count),
      },
      values: {
        estimated_items_total: String(event.estimated_items_total),
        internal_cost_total: String(event.internal_cost_total),
        selected_proposals_total: String(event.selected_proposals_total),
        planning_cost_total: String(event.planning_cost_total),
      },
      estimated_ticket: estimatedTicket(event),
    }
  }
}

function estimatedTicket(event) {
  if (Number(event.incomplete_budget_item_count) > 0) return null

  const cost = Number(event.planning_cost_total) + Number(event.internal_cost_total)
  const margin = Number(event.profit_margin)
  if (!Number.isFinite(cost) || cost <= 0 || !Number.isFinite(margin) || margin < 0 || margin >= 1) {
    return null
  }

  const ticketFor = (audience) => {
    const denominator = Number(audience) * (1 - margin)
    return denominator > 0 ? (cost / denominator).toFixed(2) : null
  }

  return {
    minimum: ticketFor(event.min_audience),
    expected: ticketFor(event.expected_audience),
    maximum: ticketFor(event.max_audience),
  }
}
