import { randomUUID } from 'node:crypto'

import { QueryTypes } from 'sequelize'

import { sequelize } from '../connectors/database_connector.js'

// 7 valores por linha: o lote fica bem abaixo do limite de 65535 placeholders do MySQL
const INSERT_BATCH_SIZE = 1000

const NOTIFICATION_COLUMNS = 'id, notification_key, type, title, body, link, read_at, created_at'

export class NotificationRepository {
  constructor(context) {
    this.session = context.dbSession
  }

  // created_at sem milissegundos, igual ao que o TIMESTAMP guarda, para o envio pelo WebSocket bater com a API
  async createMany(drafts) {
    if (drafts.length === 0) return []

    const createdAt = new Date(Math.floor(Date.now() / 1000) * 1000)
    const notifications = drafts.map((draft) => ({ ...draft, notification_key: randomUUID(), read_at: null, created_at: createdAt }))

    for (let start = 0; start < notifications.length; start += INSERT_BATCH_SIZE) {
      const batch = notifications.slice(start, start + INSERT_BATCH_SIZE)
      await sequelize.query(
        `INSERT INTO notification (notification_key, user_id, type, title, body, link, created_at)
         VALUES ${batch.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(', ')}`,
        {
          replacements: batch.flatMap((notification) => [
            notification.notification_key,
            notification.userId,
            notification.type,
            notification.title,
            notification.body,
            notification.link,
            notification.created_at,
          ]),
          transaction: this.session,
        },
      )
    }
    return notifications
  }

  // da mais recente para a mais antiga; busca uma a mais para saber se há próxima página
  async getPage(userId, { limit, beforeId }) {
    return sequelize.query(
      `SELECT ${NOTIFICATION_COLUMNS}
       FROM notification
       WHERE user_id = :userId AND (:beforeId IS NULL OR id < :beforeId)
       ORDER BY id DESC
       LIMIT :limitPlusOne`,
      { replacements: { userId, beforeId, limitPlusOne: limit + 1 }, transaction: this.session, type: QueryTypes.SELECT },
    )
  }

  async countUnread(userId) {
    const [row] = await sequelize.query('SELECT COUNT(*) AS total FROM notification WHERE user_id = :userId AND read_at IS NULL', {
      replacements: { userId },
      transaction: this.session,
      type: QueryTypes.SELECT,
    })
    return Number(row.total)
  }

  async getByKey(userId, notificationKey) {
    const [notification] = await sequelize.query(
      `SELECT ${NOTIFICATION_COLUMNS} FROM notification WHERE user_id = :userId AND notification_key = :notificationKey`,
      { replacements: { userId, notificationKey }, transaction: this.session, type: QueryTypes.SELECT },
    )
    return notification ?? null
  }

  async markAsRead(notificationId) {
    await sequelize.query('UPDATE notification SET read_at = UTC_TIMESTAMP() WHERE id = :notificationId AND read_at IS NULL', {
      replacements: { notificationId },
      transaction: this.session,
    })
  }

  // ler a conversa também apaga do sininho as notificações de mensagem dela
  async markMessagesAsRead(userId, link) {
    const [result] = await sequelize.query(
      `UPDATE notification SET read_at = UTC_TIMESTAMP()
       WHERE user_id = :userId AND type = 'message' AND link = :link AND read_at IS NULL`,
      { replacements: { userId, link }, transaction: this.session },
    )
    return result.affectedRows ?? 0
  }

  // para todos os usuários: usada quando um admin decide um cadastro
  async markAsReadByLink(type, link) {
    await sequelize.query('UPDATE notification SET read_at = UTC_TIMESTAMP() WHERE type = :type AND link = :link AND read_at IS NULL', {
      replacements: { type, link },
      transaction: this.session,
    })
  }

  async markAllAsRead(userId) {
    await sequelize.query('UPDATE notification SET read_at = UTC_TIMESTAMP() WHERE user_id = :userId AND read_at IS NULL', {
      replacements: { userId },
      transaction: this.session,
    })
  }
}
