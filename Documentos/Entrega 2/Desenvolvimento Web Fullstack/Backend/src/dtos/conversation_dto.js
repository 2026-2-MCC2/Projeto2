import { EVENT_STATUSES, PROPOSAL_STATUSES } from '../constants.js'
import { toIsoString } from './supplier_event_dto.js'

export class ConversationDto {
  static fromParty(party, counterpart, messages, userId) {
    return {
      proposal: {
        proposal_key: party.proposal_key,
        event_key: party.event_key,
        event_name: party.event_name,
        event_status: party.event_status,
        item_description: party.item_description,
        amount: Number(party.amount),
        status: party.status,
      },
      counterpart,
      can_send: ConversationDto.canSend(party),
      data: messages.map((message) => ConversationDto.fromMessage(message, userId)),
    }
  }

  // só aceita mensagem com o evento em cotação, a proposta não retirada e os dois lados ativos
  static canSend(party) {
    return (
      party.event_status === EVENT_STATUSES.OPEN_FOR_QUOTES &&
      party.status !== PROPOSAL_STATUSES.WITHDRAWN &&
      party.organizer_status === 'approved' &&
      party.supplier_status === 'approved'
    )
  }

  // row: linha do ProposalMessageRepository.getConversations; isOnline vem do hub do WebSocket
  static fromConversationRow(row, userId, isOnline) {
    const isSupplier = row.supplier_user_id === userId
    const counterpartKey = isSupplier ? row.organizer_user_key : row.supplier_user_key
    return {
      proposal_key: row.proposal_key,
      event_key: row.event_key,
      event_name: row.event_name,
      item_description: row.item_description,
      proposal_status: row.proposal_status,
      counterpart: { name: isSupplier ? row.organizer_name : row.supplier_name, online: isOnline(counterpartKey) },
      last_message: {
        body: row.body,
        mine: row.sender_user_id === userId,
        created_at: toIsoString(row.created_at),
        read: row.read_at !== null,
      },
      unread: Number(row.unread),
    }
  }

  static fromMessage(message, userId) {
    return {
      message_key: message.message_key,
      body: message.body,
      mine: message.sender_user_id === userId,
      created_at: toIsoString(message.created_at),
      read: message.read_at !== null,
    }
  }
}
