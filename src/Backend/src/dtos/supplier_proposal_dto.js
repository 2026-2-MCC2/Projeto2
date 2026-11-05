// Respostas das propostas do próprio fornecedor: chaves públicas, nunca ids internos do banco.

import { PROPOSAL_STATUSES } from '../constants.js'
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
      // [{ photo_key, url }] com a URL de leitura assinada (ver utils/proposal_photo_tools.js)
      photos: photos,
      organizer_contact: organizerContactOf(proposal),
    }
  }
}

// o contato do organizador só aparece quando o fornecedor precisa falar com ele: para combinar a
// entrega da proposta aceita ou os custos de um evento cancelado
const STATUSES_WITH_ORGANIZER_CONTACT = new Set([PROPOSAL_STATUSES.ACCEPTED, PROPOSAL_STATUSES.CANCELED])

function organizerContactOf(proposal) {
  if (!STATUSES_WITH_ORGANIZER_CONTACT.has(proposal.status)) return null
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
