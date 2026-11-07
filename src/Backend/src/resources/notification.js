import { NotificationController } from '../controllers/notification_controller.js'
import { getParam, getParamAsInt } from '../utils/request_params.js'

// qualquer perfil logado, sempre só as próprias notificações
export class NotificationResource {
  async onGetList(req, res) {
    const controller = new NotificationController(req.context)
    const notifications = await controller.getNotifications(req.context.user.userKey, {
      limit: getParamAsInt(req, 'limit', { minValue: 1, maxValue: 100, default: 20 }),
      after: getParam(req, 'after'),
    })

    res.status(200).json(notifications)
  }

  async onPatchRead(req, res, notificationKey) {
    const controller = new NotificationController(req.context)
    await controller.markAsRead(req.context.user.userKey, notificationKey)

    res.status(204).end()
  }

  async onPostReadAll(req, res) {
    const controller = new NotificationController(req.context)
    await controller.markAllAsRead(req.context.user.userKey)

    res.status(204).end()
  }
}
