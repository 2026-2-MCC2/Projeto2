import { USER_PROFILES } from '../constants.js'
import { AdminUserController } from '../controllers/admin_user_controller.js'
import { getParam, getParamAsInt } from '../utils/request_params.js'
import { SecurityTools } from '../utils/security_tools.js'
import { SchemaHandler } from '../utils/schema_handler.js'

export class AdminUserResource {
  async onGetList(req, res) {
    SecurityTools.requireProfile(req.context, [USER_PROFILES.ADMIN])

    const limit = getParamAsInt(req, 'limit', { minValue: 0, maxValue: 100, default: 10 })
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

  async onPutByKey(req, res, userKey) {
    // autorização antes do schema para não-admins sempre receberem 403
    SecurityTools.requireProfile(req.context, [USER_PROFILES.ADMIN])
    SchemaHandler.validate(req, 'put_admin_user_status.json')

    const controller = new AdminUserController(req.context)
    const { status, reason } = req.context.media
    const userDto = await controller.decideStatus(userKey, status, reason)

    res.status(202).json(userDto)
  }
}
