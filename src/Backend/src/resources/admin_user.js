// Resource das rotas administrativas de cadastro: listar os cadastros e decidir o status de um deles.
// Só o perfil admin usa estas rotas. Para testar na mão, gere um token: npm run token -- admin
// (o admin do token também precisa existir aprovado no banco, ver middlewares/user_status.js).

import { USER_PROFILES } from '../constants.js'
import { AdminUserController } from '../controllers/admin_user_controller.js'
import { getParam, getParamAsInt } from '../utils/request_params.js'
import { SecurityTools } from '../utils/security_tools.js'
import { SchemaHandler } from '../utils/schema_handler.js'

export class AdminUserResource {
  // GET /event_planning/admin/users?status=pending&limit=10&page=0
  //   curl 'localhost:3300/event_planning/admin/users?status=pending' -H "Authorization: Bearer $TOKEN"
  //   200 { "data": [ { "user_key": "...", "name": "...", "profile": "organizador", "email": "...",
  //                     "status": "pending", "created_at": "...", "cnpj": "...", "phone": "..." } ],
  //         "limit": 10, "page": 0, "is_last_page": true }
  //   400 { "code": "APP000010", ... } se status, limit ou page forem inválidos
  //   403 { "code": "APP000403", ... } se o perfil não for admin
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
    // A autorização vem antes do schema para não-admins sempre receberem 403.
    SecurityTools.requireProfile(req.context, [USER_PROFILES.ADMIN])
    SchemaHandler.validate(req, 'put_admin_user_status.json')

    const controller = new AdminUserController(req.context)
    const userDto = await controller.decideStatus(userKey, req.context.media.status)

    res.status(202).json(userDto)
  }
}
