import { USER_PROFILES } from '../constants.js'
import { WebSocketHub } from '../connectors/websocket_hub.js'
import { ConversationController } from '../controllers/conversation_controller.js'
import { SchemaHandler } from '../utils/schema_handler.js'
import { SecurityTools } from '../utils/security_tools.js'

const CONVERSATION_PROFILES = [USER_PROFILES.SUPPLIER, USER_PROFILES.ORGANIZER]

export class ConversationResource {
  async onGetMessages(req, res, proposalKey) {
    SecurityTools.requireProfile(req.context, CONVERSATION_PROFILES)

    const controller = new ConversationController(req.context)
    const conversation = await controller.getConversation(req.context.user.userKey, proposalKey)

    res.status(200).json(conversation)
  }

  async onPostMessages(req, res, proposalKey) {
    // autorização antes do schema para outros perfis sempre receberem 403
    SecurityTools.requireProfile(req.context, CONVERSATION_PROFILES)
    SchemaHandler.validate(req, 'post_proposal_message.json')

    const controller = new ConversationController(req.context)
    const { message, pushes } = await controller.sendMessage(req.context.user.userKey, proposalKey, req.context.media.body)

    res.status(201).json(message)
    WebSocketHub.send(pushes)
  }

  async onPostMessagesRead(req, res, proposalKey) {
    SecurityTools.requireProfile(req.context, CONVERSATION_PROFILES)

    const controller = new ConversationController(req.context)
    const pushes = await controller.markAsRead(req.context.user.userKey, proposalKey)

    res.status(204).end()
    WebSocketHub.send(pushes)
  }

  async onGetConversations(req, res) {
    SecurityTools.requireProfile(req.context, CONVERSATION_PROFILES)

    const controller = new ConversationController(req.context)
    res.status(200).json(await controller.getConversations(req.context.user.userKey))
  }

  async onGetUnread(req, res) {
    SecurityTools.requireProfile(req.context, CONVERSATION_PROFILES)

    const controller = new ConversationController(req.context)
    const unread = await controller.getUnread(req.context.user.userKey)

    res.status(200).json(unread)
  }
}
