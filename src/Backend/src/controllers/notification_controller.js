import { NotificationDto } from '../dtos/notification_dto.js'
import { NotFoundNotification } from '../errors/index.js'
import { NotificationRepository } from '../repositories/notification_repository.js'
import { UserRepository } from '../repositories/user_repository.js'
import { decodeCursor, encodeCursor } from '../utils/cursor.js'
import { BaseController } from './base_controller.js'

export class NotificationController extends BaseController {
  constructor(context) {
    super(context, 'NotificationController')
    this.userRepository = new UserRepository(context)
    this.notificationRepository = new NotificationRepository(context)
  }

  async getNotifications(userKey, { limit, after }) {
    const user = await this.userRepository.getByKey(userKey)
    const beforeId = after === undefined ? null : fromCursor(after)

    const rows = await this.notificationRepository.getPage(user.id, { limit, beforeId })
    const page = rows.slice(0, limit)
    const isLastPage = rows.length <= limit

    return {
      data: page.map(NotificationDto.fromRow),
      unread_count: await this.notificationRepository.countUnread(user.id),
      next_cursor: isLastPage ? null : toCursor(page.at(-1)),
    }
  }

  async markAsRead(userKey, notificationKey) {
    const user = await this.userRepository.getByKey(userKey)
    const notification = await this.notificationRepository.getByKey(user.id, notificationKey)
    if (!notification) {
      throw new NotFoundNotification(notificationKey)
    }

    await this.notificationRepository.markAsRead(notification.id)
    await this.session.commit()
  }

  async markAllAsRead(userKey) {
    const user = await this.userRepository.getByKey(userKey)
    await this.notificationRepository.markAllAsRead(user.id)
    await this.session.commit()
  }
}

// id da última notificação mostrada
function toCursor(notification) {
  return encodeCursor([notification.id])
}

function fromCursor(after) {
  return decodeCursor(after, ([notificationId]) => {
    if (!Number.isInteger(notificationId)) throw new Error('invalid cursor')
    return notificationId
  })
}
