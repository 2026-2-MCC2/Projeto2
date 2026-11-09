export class SupplierEventDto {
  static fromList(events) {
    return events.map((event) => ({
      event_key: event.event_key,
      name: event.name,
      category: event.category,
      description: event.description ?? null,
      start_date: toIsoString(event.start_date),
      end_date: toIsoString(event.end_date),
      venue_name: event.venue_name,
      city: event.city,
      state: event.state,
      min_audience: Number(event.min_audience),
      expected_audience: Number(event.expected_audience),
      max_audience: Number(event.max_audience),
      items_count: Number(event.items_count),
      categories: event.categories ? event.categories.split('|') : [],
    }))
  }

  static fromDetail(event, items) {
    return {
      event_key: event.event_key,
      name: event.name,
      category: event.category,
      description: event.description ?? null,
      start_date: toIsoString(event.start_date),
      end_date: toIsoString(event.end_date),
      venue_name: event.venue_name,
      address: event.address,
      city: event.city,
      state: event.state,
      min_audience: Number(event.min_audience),
      expected_audience: Number(event.expected_audience),
      max_audience: Number(event.max_audience),
      status: event.status,
      organizer_name: event.organizer_name,
      items: items.map((item) => ({
        item_key: item.item_key,
        category: item.category,
        description: item.description,
        type: item.type,
        quantity: Number(item.quantity),
        estimated_value: item.estimated_value === null ? null : Number(item.estimated_value),
        notes: item.notes ?? null,
        // o organizador já escolheu uma proposta (de qualquer fornecedor): o item não aceita mais envio
        decided: Boolean(Number(item.decided)),
        my_proposal: item.proposal_key
          ? {
              proposal_key: item.proposal_key,
              status: item.proposal_status,
              amount: Number(item.proposal_amount),
              valid_until: toDateString(item.proposal_valid_until),
            }
          : null,
      })),
    }
  }
}

export function toIsoString(value) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

export function toDateString(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return value ? String(value).slice(0, 10) : null
}
