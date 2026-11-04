import { isFinalEventStatus } from '../constants.js'

export class EventDto {
  static fromModel(event) {
    if (!event) return null

    const internalCosts = event.internal_costs
      ? event.internal_costs.map((cost) => ({
          internal_cost_key: cost.internal_cost_key,
          type: cost.type,
          description: cost.description,
          amount: Number(cost.amount),
        }))
      : []

    const totalInternalCost = internalCosts.reduce((total, cost) => total + cost.amount, 0)
    const totalAcceptedProposals = Number(event.get?.('total_accepted_proposals') ?? event.total_accepted_proposals ?? 0)

    return {
      event_key: event.event_key,
      name: event.name,
      category: event.category,
      description: event.description ?? null,
      start_date: event.start_date instanceof Date ? event.start_date.toISOString() : event.start_date,
      end_date: event.end_date instanceof Date ? event.end_date.toISOString() : event.end_date,
      venue_name: event.venue_name,
      address: event.address,
      city: event.city,
      state: event.state,
      zip_code: event.zip_code ?? null,
      venue_capacity: event.venue_capacity !== null && event.venue_capacity !== undefined ? Number(event.venue_capacity) : null,
      min_audience: Number(event.min_audience),
      expected_audience: Number(event.expected_audience),
      max_audience: Number(event.max_audience),
      profit_margin: Number(event.profit_margin),
      reference_scenario: event.reference_scenario,
      status: event.status,
      cancellation_reason: event.cancellation_reason ?? null,
      // o front mostra o botão de editar a partir daqui, sem repetir a regra dos status finais
      is_editable: !isFinalEventStatus(event.status),
      created_at: event.created_at instanceof Date ? event.created_at.toISOString() : event.created_at,
      internal_costs: internalCosts,
      total_internal_cost: totalInternalCost,
      total_accepted_proposals: totalAcceptedProposals,
      total_cost: totalInternalCost + totalAcceptedProposals,
    }
  }

  static fromList(events) {
    return events.map((event) => EventDto.fromModel(event))
  }
}
