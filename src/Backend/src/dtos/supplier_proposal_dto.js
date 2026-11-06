import { PROPOSAL_STATUSES } from '../constants.js'
import { toDateString, toIsoString } from './supplier_event_dto.js'

export class SupplierProposalDto {
  static fromCreated(proposal) {
    return {
      proposal_key: proposal.proposal_key,
      status: proposal.status,
    }
  }

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
        estimated_value: proposal.item_estimated_value === null ? null : Number(proposal.item_estimated_value),
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
      photos: photos,
      organizer_contact: organizerContactOf(proposal),
    }
  }
}

// contato só para quem tem algo a combinar: proposta aceita, ou aceita antes do cancelamento (que mantém o selected)
function organizerContactOf(proposal) {
  const wasChosen =
    proposal.status === PROPOSAL_STATUSES.ACCEPTED || (proposal.status === PROPOSAL_STATUSES.CANCELED && Boolean(proposal.selected))
  if (!wasChosen) return null
  return { name: proposal.organizer_name, email: proposal.organizer_email, phone: proposal.organizer_phone }
}

function eventOf(proposal) {
  return {
    event_key: proposal.event_key,
    name: proposal.event_name,
    status: proposal.event_status,
    cancellation_reason: proposal.event_cancellation_reason ?? null,
  }
}
