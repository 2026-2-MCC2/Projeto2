// Converte o modelo de item de custo no formato público da API.

export class BudgetItemDTO {
  static fromModel(item, { proposalsCount = 0, acceptedProposal = null } = {}) {
    return {
      item_key: item.budget_item_key,
      category: item.category.name,
      description: item.description,
      type: item.type,
      quantity: Number(item.quantity),
      estimated_value: item.estimated_value === null ? null : Number(item.estimated_value),
      notes: item.notes ?? null,
      proposals_count: proposalsCount,
      accepted_proposal: acceptedProposal,
    }
  }

  static fromList(items) {
    return items.map((item) => BudgetItemDTO.fromModel(item))
  }
}
