import { WebSocketHub } from '../connectors/websocket_hub.js'
import { ConversationDto } from '../dtos/conversation_dto.js'
import { ConversationClosed, NotFoundProposal } from '../errors/index.js'
import { NotificationRepository } from '../repositories/notification_repository.js'
import { ProposalMessageRepository } from '../repositories/proposal_message_repository.js'
import { ProposalRepository } from '../repositories/proposal_repository.js'
import { UserRepository } from '../repositories/user_repository.js'
import { NotificationDrafts, organizerProposalLink, supplierProposalLink } from '../utils/notification_drafts.js'
import { BaseController } from './base_controller.js'
import { Notifier } from './notifier.js'

// a aba Chats mostra as conversas mais recentes; mais que isso não cabe numa lista útil
const MAX_CONVERSATIONS = 100

// conversa de uma proposta, entre o fornecedor dono dela e o organizador dono do evento
export class ConversationController extends BaseController {
  constructor(context) {
    super(context, 'ConversationController')
    this.userRepository = new UserRepository(context)
    this.proposalRepository = new ProposalRepository(context)
    this.messageRepository = new ProposalMessageRepository(context)
    this.notificationRepository = new NotificationRepository(context)
    this.notifier = new Notifier(context)
  }

  async getConversation(userKey, proposalKey) {
    const user = await this.userRepository.getByKey(userKey)
    const { party, isSupplier } = await this.#getParticipation(user, proposalKey)
    const messages = await this.messageRepository.getByProposal(party.id)

    const counterpart = isSupplier
      ? { name: party.organizer_name, online: WebSocketHub.isOnline(party.organizer_user_key) }
      : { name: party.supplier_name, online: WebSocketHub.isOnline(party.supplier_user_key) }
    return ConversationDto.fromParty(party, counterpart, messages, user.id)
  }

  async sendMessage(userKey, proposalKey, text) {
    const user = await this.userRepository.getByKey(userKey)
    const { party, isSupplier } = await this.#getParticipation(user, proposalKey, { lockEvent: true })
    if (!ConversationDto.canSend(party)) {
      throw new ConversationClosed()
    }

    const body = text.trim()
    const created = await this.messageRepository.create(party.id, user.id, body)
    const pushes = await this.notifier.notify([NotificationDrafts.message(party, isSupplier, body)])
    await this.session.commit()

    const message = ConversationDto.fromMessage(created, user.id)
    const counterpartKey = isSupplier ? party.organizer_user_key : party.supplier_user_key
    // quem enviou também recebe, para as outras abas abertas mostrarem a mensagem
    pushes.push(
      { userKey: counterpartKey, data: { type: 'message', proposal_key: proposalKey, message: { ...message, mine: false } } },
      { userKey: user.user_key, data: { type: 'message', proposal_key: proposalKey, message } },
    )
    return { message, pushes }
  }

  async markAsRead(userKey, proposalKey) {
    const user = await this.userRepository.getByKey(userKey)
    const { party, isSupplier } = await this.#getParticipation(user, proposalKey)
    const readMessages = await this.messageRepository.markAsReadFromOthers(party.id, user.id)
    const link = isSupplier ? supplierProposalLink(party) : organizerProposalLink(party)
    const readNotifications = await this.notificationRepository.markMessagesAsRead(user.id, link)
    await this.session.commit()

    // só avisa quando algo mudou: o outro lado mostra as mensagens dele como lidas e as abas de quem leu atualizam o sininho
    const counterpartKey = isSupplier ? party.organizer_user_key : party.supplier_user_key
    const pushes = []
    if (readMessages > 0) pushes.push({ userKey: counterpartKey, data: { type: 'read', proposal_key: proposalKey } })
    if (readNotifications > 0 || readMessages > 0) pushes.push({ userKey: user.user_key, data: { type: 'notifications_changed' } })
    return pushes
  }

  async getConversations(userKey) {
    const user = await this.userRepository.getByKey(userKey)
    const rows = await this.messageRepository.getConversations(user.id, MAX_CONVERSATIONS)
    return { data: rows.map((row) => ConversationDto.fromConversationRow(row, user.id, (key) => WebSocketHub.isOnline(key))) }
  }

  async getUnread(userKey) {
    const user = await this.userRepository.getByKey(userKey)
    const rows = await this.messageRepository.countUnreadByProposal(user.id)
    return {
      total: rows.reduce((sum, row) => sum + Number(row.total), 0),
      by_proposal: Object.fromEntries(rows.map((row) => [row.proposal_key, Number(row.total)])),
    }
  }

  // quem não participa da conversa recebe 404, sem saber que a proposta existe
  async #getParticipation(user, proposalKey, { lockEvent = false } = {}) {
    const [party] = await this.proposalRepository.getProposalParties([proposalKey], { lockEvent })
    const isSupplier = party?.supplier_user_id === user.id
    if (!party || (!isSupplier && party.organizer_user_id !== user.id)) {
      throw new NotFoundProposal(proposalKey)
    }
    return { party, isSupplier }
  }
}
