import { NotificationDto } from '../dtos/notification_dto.js'
import { NotificationRepository } from '../repositories/notification_repository.js'

// grava na transação do fluxo e devolve o que o resource empurra pelo WebSocket depois do commit
export class Notifier {
  constructor(context) {
    this.notificationRepository = new NotificationRepository(context)
  }

  async notify(drafts) {
    const notifications = await this.notificationRepository.createMany(drafts)
    return notifications.map(NotificationDto.toPush)
  }
}
