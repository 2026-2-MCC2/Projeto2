import { randomUUID } from 'node:crypto'

import { QueryTypes } from 'sequelize'

import { sequelize } from '../connectors/database_connector.js'

export class ProposalMessageRepository {
  constructor(context) {
    this.session = context.dbSession
  }

  // created_at sem milissegundos, igual ao que o TIMESTAMP guarda, para o envio pelo WebSocket bater com a API
  async create(proposalId, senderUserId, body) {
    const message = {
      message_key: randomUUID(),
      sender_user_id: senderUserId,
      body,
      read_at: null,
      created_at: new Date(Math.floor(Date.now() / 1000) * 1000),
    }
    await sequelize.query(
      `INSERT INTO proposal_message (message_key, proposal_id, sender_user_id, body, created_at)
       VALUES (:messageKey, :proposalId, :senderUserId, :body, :createdAt)`,
      {
        replacements: { messageKey: message.message_key, proposalId, senderUserId, body, createdAt: message.created_at },
        transaction: this.session,
      },
    )
    return message
  }

  async getByProposal(proposalId) {
    return sequelize.query(
      `SELECT message_key, sender_user_id, body, read_at, created_at
       FROM proposal_message
       WHERE proposal_id = :proposalId
       ORDER BY id ASC`,
      { replacements: { proposalId }, transaction: this.session, type: QueryTypes.SELECT },
    )
  }

  // devolve quantas mensagens mudaram, para só avisar pelo WebSocket quando houve leitura de fato
  async markAsReadFromOthers(proposalId, userId) {
    const [result] = await sequelize.query(
      `UPDATE proposal_message SET read_at = UTC_TIMESTAMP()
       WHERE proposal_id = :proposalId AND sender_user_id <> :userId AND read_at IS NULL`,
      { replacements: { proposalId, userId }, transaction: this.session },
    )
    return result.affectedRows ?? 0
  }

  // conversas com pelo menos uma mensagem, da última mensagem mais recente para a mais antiga
  async getConversations(userId, limit) {
    return sequelize.query(
      `SELECT proposal.proposal_key, proposal.status AS proposal_status,
              event.event_key, event.name AS event_name, budget_item.description AS item_description,
              supplier_user.id AS supplier_user_id, supplier_user.user_key AS supplier_user_key, supplier_user.name AS supplier_name,
              organizer_user.user_key AS organizer_user_key, organizer_user.name AS organizer_name,
              last_message.body, last_message.sender_user_id, last_message.created_at, last_message.read_at,
              (SELECT COUNT(*) FROM proposal_message AS unread
               WHERE unread.proposal_id = proposal.id AND unread.sender_user_id <> :userId AND unread.read_at IS NULL) AS unread
       FROM proposal
       INNER JOIN budget_item ON budget_item.id = proposal.budget_item_id
       INNER JOIN event ON event.id = budget_item.event_id
       INNER JOIN supplier ON supplier.id = proposal.supplier_id
       INNER JOIN user AS supplier_user ON supplier_user.id = supplier.user_id
       INNER JOIN organizer ON organizer.id = event.organizer_id
       INNER JOIN user AS organizer_user ON organizer_user.id = organizer.user_id
       INNER JOIN proposal_message AS last_message
         ON last_message.id = (SELECT MAX(id) FROM proposal_message WHERE proposal_message.proposal_id = proposal.id)
       WHERE supplier.user_id = :userId OR organizer.user_id = :userId
       ORDER BY last_message.id DESC
       LIMIT :limit`,
      { replacements: { userId, limit }, transaction: this.session, type: QueryTypes.SELECT },
    )
  }

  // mensagens não lidas que o outro lado mandou, por proposta, nas conversas de que o usuário participa
  async countUnreadByProposal(userId) {
    return sequelize.query(
      `SELECT proposal.proposal_key, COUNT(*) AS total
       FROM proposal_message
       INNER JOIN proposal ON proposal.id = proposal_message.proposal_id
       INNER JOIN supplier ON supplier.id = proposal.supplier_id
       INNER JOIN budget_item ON budget_item.id = proposal.budget_item_id
       INNER JOIN event ON event.id = budget_item.event_id
       INNER JOIN organizer ON organizer.id = event.organizer_id
       WHERE proposal_message.read_at IS NULL AND proposal_message.sender_user_id <> :userId
         AND (supplier.user_id = :userId OR organizer.user_id = :userId)
       GROUP BY proposal.proposal_key`,
      { replacements: { userId }, transaction: this.session, type: QueryTypes.SELECT },
    )
  }
}
