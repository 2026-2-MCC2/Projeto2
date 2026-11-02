// Resource da rota administrativa para decidir o status de um cadastro.

import { USER_PROFILES } from '../constants.js'
import { AdminUserController } from '../controllers/admin_user_controller.js'
import { SecurityTools } from '../utils/security_tools.js'
import { SchemaHandler } from '../utils/schema_handler.js'

export class AdminUserResource {
  async onPutByKey(req, res, userKey) {
    // A autorização vem antes do schema para não-admins sempre receberem 403.
    SecurityTools.requireProfile(req.context, [USER_PROFILES.ADMIN])
    SchemaHandler.validate(req, 'put_admin_user_status.json')

    const controller = new AdminUserController(req.context)
    const userDto = await controller.decideStatus(userKey, req.context.media.status)

    res.status(202).json(userDto)
  }
}
