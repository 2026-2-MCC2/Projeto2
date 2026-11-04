// Organiza e expõe apenas os dados necessários para comparar propostas.

export class ProposalComparisonDTO {
  static fromRows(eventKey, rows) {
    const itemsByKey = new Map()

    for (const row of rows) {
      if (row.budget_item_key === null) continue

      if (!itemsByKey.has(row.budget_item_key)) {
        itemsByKey.set(row.budget_item_key, {
          item_key: row.budget_item_key,
          description: row.item_description,
          proposals: [],
        })
      }

      if (row.proposal_key !== null) {
        itemsByKey.get(row.budget_item_key).proposals.push({
          proposal_key: row.proposal_key,
          supplier_name: row.supplier_name,
          amount: Number(row.amount),
          valid_until: row.valid_until,
          notes: row.notes,
          status: row.status,
          is_expired: Boolean(row.is_expired),
        })
      }
    }

    return {
      event_key: eventKey,
      total_cost: Number(rows[0]?.total_cost ?? 0),
      items: [...itemsByKey.values()],
    }
  }
}
