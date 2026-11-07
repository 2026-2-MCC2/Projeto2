// textos e destinos das notificações; party é a linha do ProposalRepository.getProposalParties

const MAX_TITLE_LENGTH = 150
const MAX_BODY_LENGTH = 500
const MESSAGE_EXCERPT_LENGTH = 140

export const supplierProposalLink = (party) => `/fornecedor/propostas/${party.proposal_key}`
export const organizerProposalLink = (party) => `/organizador/eventos/${party.event_key}/propostas/${party.proposal_key}`

function draft(type, { userId, userKey }, title, body, link) {
  return { type, userId, userKey, title: truncate(title, MAX_TITLE_LENGTH), body: truncate(body, MAX_BODY_LENGTH), link }
}

const toOrganizer = (party) => ({ userId: party.organizer_user_id, userKey: party.organizer_user_key })
const toSupplier = (party) => ({ userId: party.supplier_user_id, userKey: party.supplier_user_key })

export class NotificationDrafts {
  static message(party, senderIsSupplier, text) {
    const senderName = senderIsSupplier ? party.supplier_name : party.organizer_name
    const recipient = senderIsSupplier ? toOrganizer(party) : toSupplier(party)
    const link = senderIsSupplier ? organizerProposalLink(party) : supplierProposalLink(party)
    return draft('message', recipient, `Nova mensagem de ${senderName}`, truncate(text, MESSAGE_EXCERPT_LENGTH), link)
  }

  static proposalReceived(party) {
    const body = `${party.supplier_name} · ${party.item_description} · ${formatAmount(party.amount)}`
    return draft('proposal_received', toOrganizer(party), 'Nova proposta recebida', body, organizerProposalLink(party))
  }

  static proposalUpdated(party) {
    const body = `${party.supplier_name} · ${party.item_description} · ${formatAmount(party.amount)}`
    return draft('proposal_updated', toOrganizer(party), 'Proposta atualizada', body, organizerProposalLink(party))
  }

  // a retirada continua visível, com a conversa: o link leva para a proposta
  static proposalWithdrawn(party) {
    const body = `${party.supplier_name} · ${party.item_description} · ${party.event_name}`
    return draft('proposal_withdrawn', toOrganizer(party), 'Proposta retirada', body, organizerProposalLink(party))
  }

  static proposalAccepted(party) {
    const body = `${party.item_description} · ${party.event_name}`
    return draft('proposal_accepted', toSupplier(party), 'Proposta aceita', body, supplierProposalLink(party))
  }

  static proposalRejected(party) {
    const body = `${party.item_description} · ${party.event_name}`
    return draft('proposal_rejected', toSupplier(party), 'Proposta recusada', body, supplierProposalLink(party))
  }

  static eventCanceled(party) {
    const body = `${party.event_name} · ${party.item_description}`
    return draft('event_canceled', toSupplier(party), 'Evento cancelado', body, supplierProposalLink(party))
  }

  // supplier: linha do SupplierEventRepository.getSuppliersMatchingEvent
  static eventPublished(event, supplier) {
    const itemsCount = Number(supplier.items_count)
    const items = itemsCount === 1 ? '1 item' : `${itemsCount} itens`
    const body = `${event.name} · ${items} em ${joinNames(supplier.categories.split('|'))}`
    const recipient = { userId: supplier.user_id, userKey: supplier.user_key }
    return draft('event_published', recipient, 'Novo evento na sua categoria', body, `/fornecedor/eventos/${event.event_key}`)
  }
}

// cada cadastro tem seu link: a decisão de qualquer admin marca como lida a notificação de todos
export const pendingRegistrationLink = (userKey) => `/admin/aprovacoes?cadastro=${userKey}`

const PROFILE_NAMES = { organizador: 'Organizador', fornecedor: 'Fornecedor' }

export class AdminNotificationDrafts {
  // admin: { id, user_key }; user: o usuário que acabou de se cadastrar
  static userPending(admin, user) {
    const recipient = { userId: admin.id, userKey: admin.user_key }
    const body = `${user.name} · ${PROFILE_NAMES[user.profile] ?? user.profile}`
    return draft('user_pending', recipient, 'Novo cadastro para aprovar', body, pendingRegistrationLink(user.user_key))
  }
}

function truncate(text, maxLength) {
  const characters = [...text.trim()]
  return characters.length <= maxLength ? characters.join('') : `${characters.slice(0, maxLength - 1).join('')}…`
}

// "R$ 31.800" ou "R$ 1.250,50", como nos cartões do Figma
function formatAmount(amount) {
  const value = Number(amount)
  const decimals = Number.isInteger(value) ? 0 : 2
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

function joinNames(names) {
  return names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} e ${names.at(-1)}`
}
