export class ProposalComparisonDTO {
  static fromRows(eventKey, rows, photosByProposalKey) {
    const itemsByKey = new Map()

    for (const row of rows) {
      if (row.budget_item_key === null) continue

      if (!itemsByKey.has(row.budget_item_key)) {
        itemsByKey.set(row.budget_item_key, {
          item_key: row.budget_item_key,
          description: row.item_description,
          category: row.item_category,
          estimated_value: row.item_estimated_value === null ? null : Number(row.item_estimated_value),
          proposals: [],
        })
      }

      if (row.proposal_key !== null) {
        itemsByKey.get(row.budget_item_key).proposals.push({
          proposal_key: row.proposal_key,
          supplier_name: row.supplier_name,
          supplier_cnpj: row.supplier_cnpj,
          amount: Number(row.amount),
          valid_until: row.valid_until,
          description: row.description,
          not_included: row.not_included ?? null,
          delivery_terms: row.delivery_terms,
          payment_terms: row.payment_terms,
          team: row.team ?? null,
          warranty: row.warranty ?? null,
          notes: row.notes,
          status: row.status,
          is_expired: Boolean(row.is_expired),
          photos: photosByProposalKey[row.proposal_key] ?? [],
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
