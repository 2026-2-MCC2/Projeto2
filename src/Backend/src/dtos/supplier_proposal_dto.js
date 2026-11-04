// Respostas das propostas do próprio fornecedor: chaves públicas, nunca ids internos do banco.

import { toDateString, toIsoString } from './supplier_event_dto.js'

export class SupplierProposalDto {
  // resposta do envio: só a chave e o status
  static fromCreated(proposal) {
    return {
      proposal_key: proposal.proposal_key,
      status: proposal.status,
    }
  }

  // histórico (GET /supplier/proposals)
  static fromList(proposals) {
    return proposals.map((proposal) => ({
      proposal_key: proposal.proposal_key,
      event: eventOf(proposal),
      item: {
        item_key: proposal.item_key,
        description: proposal.item_description,
        category: proposal.item_category,
      },
      amount: Number(proposal.amount),
      valid_until: toDateString(proposal.valid_until),
      status: proposal.status,
      selected: Boolean(proposal.selected),
      sent_at: toIsoString(proposal.sent_at),
    }))
  }

  // detalhe com todos os campos da proposta (GET, PUT /supplier/proposals/:proposal_key)
  static fromDetail(proposal, photos) {
    return {
      proposal_key: proposal.proposal_key,
      event: { ...eventOf(proposal), end_date: toIsoString(proposal.event_end_date) },
      item: {
        item_key: proposal.item_key,
        description: proposal.item_description,
        category: proposal.item_category,
        type: proposal.item_type,
        quantity: Number(proposal.item_quantity),
      },
      amount: Number(proposal.amount),
      description: proposal.description,
      not_included: proposal.not_included ?? null,
      delivery_terms: proposal.delivery_terms,
      payment_terms: proposal.payment_terms,
      team: proposal.team ?? null,
      warranty: proposal.warranty ?? null,
      valid_until: toDateString(proposal.valid_until),
      notes: proposal.notes ?? null,
      status: proposal.status,
      selected: Boolean(proposal.selected),
      sent_at: toIsoString(proposal.sent_at),
      photos: photos.map((photo) => ({ position: Number(photo.position), url: photo.url })),
    }
  }
}

function eventOf(proposal) {
  return {
    event_key: proposal.event_key,
    name: proposal.event_name,
    status: proposal.event_status,
  }
}
