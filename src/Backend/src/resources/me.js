import { AccountController } from '../controllers/account_controller.js'
import { AuthController } from '../controllers/auth_controller.js'
import { SchemaHandler } from '../utils/schema_handler.js'

export class MeResource {
  async onGet(req, res) {
    const controller = new AuthController(req.context)
    const userDto = await controller.getCurrentUser(req.context.user.userKey)

    res.status(200).json(userDto)
  }

  async onPatch(req, res) {
    SchemaHandler.validate(req, 'patch_me.json')

    const controller = new AccountController(req.context)
    const userDto = await controller.updateProfile(req.context.user.userKey, req.context.media)

    res.status(200).json(userDto)
  }

  async onPutCategorias(req, res) {
    SchemaHandler.validate(req, 'put_me_categorias.json')

    const controller = new AccountController(req.context)
    const userDto = await controller.updateSupplierCategories(req.context.user.userKey, req.context.media.categories)

    res.status(200).json(userDto)
  }

  async onPutSenha(req, res) {
    SchemaHandler.validate(req, 'put_me_senha.json')

    const controller = new AccountController(req.context)
    const tokenDto = await controller.changePassword(req.context.user.userKey, req.context.media)

    res.status(200).json(tokenDto)
  }
}
