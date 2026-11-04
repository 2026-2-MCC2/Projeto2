// Converte o modelo de item de custo no formato público da API.

export class BudgetItemDTO {
  static fromModel(item, { proposalsCount = 0, acceptedProposal = null } = {}) {
    const acceptedProposalData = parseAcceptedProposal(item.accepted_proposal ?? acceptedProposal)
    return {
      item_key: item.budget_item_key,
      category: typeof item.category === 'string' ? item.category : item.category.name,
      description: item.description,
      type: item.type,
      quantity: Number(item.quantity),
      estimated_value: item.estimated_value === null ? null : Number(item.estimated_value),
      notes: item.notes ?? null,
      proposals_count: Number(item.proposals_count ?? proposalsCount),
      accepted_proposal: acceptedProposalData,
    }
  }

  static fromList(items) {
    return items.map((item) => BudgetItemDTO.fromModel(item))
  }
}

function parseAcceptedProposal(value) {
  if (value === null || value === undefined) {
    return null
  }

  const proposal = typeof value === 'string' ? JSON.parse(value) : value
  return { proposal_key: proposal.proposal_key, amount: Number(proposal.amount) }
}
