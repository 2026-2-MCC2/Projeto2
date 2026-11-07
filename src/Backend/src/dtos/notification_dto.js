import { toIsoString } from './supplier_event_dto.js'

export class NotificationDto {
  static fromRow(notification) {
    return {
      notification_key: notification.notification_key,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      link: notification.link ?? null,
      read: notification.read_at !== null,
      created_at: toIsoString(notification.created_at),
    }
  }

  // o que o WebSocketHub empurra para o dono da notificação
  static toPush(notification) {
    return { userKey: notification.userKey, data: { type: 'notification', notification: NotificationDto.fromRow(notification) } }
  }
}
