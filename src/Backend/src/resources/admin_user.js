import { USER_PROFILES } from '../constants.js'
import { EmailConnector } from '../connectors/email_connector.js'
import { AdminUserController } from '../controllers/admin_user_controller.js'
import { PasswordResetController } from '../controllers/password_reset_controller.js'
import { getParam, getParamAsInt } from '../utils/request_params.js'
import { SecurityTools } from '../utils/security_tools.js'
import { SchemaHandler } from '../utils/schema_handler.js'

export class AdminUserResource {
  async onGetList(req, res) {
    SecurityTools.requireProfile(req.context, [USER_PROFILES.ADMIN])

    const limit = getParamAsInt(req, 'limit', { minValue: 1, maxValue: 100, default: 10 })
    const page = getParamAsInt(req, 'page', { minValue: 0, default: 0 })
    const offset = page * limit
    const status = getParam(req, 'status')

    const controller = new AdminUserController(req.context)
    const usersPage = await controller.getRegistrationList(limit, offset, status)

    res.status(200).json({
      data: usersPage.usersListDto,
      limit: limit,
      page: page,
      is_last_page: usersPage.isLastPage,
    })
  }

  async onGetStatusHistory(req, res) {
    SecurityTools.requireProfile(req.context, [USER_PROFILES.ADMIN])

    const limit = getParamAsInt(req, 'limit', { minValue: 1, maxValue: 100, default: 20 })
    const page = getParamAsInt(req, 'page', { minValue: 0, default: 0 })

    const controller = new AdminUserController(req.context)
    const history = await controller.getStatusHistory(limit, page * limit)

    res.status(200).json({ data: history.events, limit: limit, page: page, is_last_page: history.isLastPage })
  }

  async onPutByKey(req, res, userKey) {
    // autorização antes do schema para não-admins sempre receberem 403
    SecurityTools.requireProfile(req.context, [USER_PROFILES.ADMIN])
    SchemaHandler.validate(req, 'put_admin_user_status.json')

    const controller = new AdminUserController(req.context)
    const { status, reason } = req.context.media
    const { userDto, email } = await controller.changeStatus(userKey, status, reason)

    res.status(202).json(userDto)
    EmailConnector.sendInBackground(email)
  }

  async onPostPasswordResetByKey(req, res, userKey) {
    SecurityTools.requireProfile(req.context, [USER_PROFILES.ADMIN])

    const controller = new PasswordResetController(req.context)
    const email = await controller.createResetEmailByUserKey(userKey)

    res.status(202).end()
    if (email !== null) EmailConnector.sendInBackground(email)
  }
}
