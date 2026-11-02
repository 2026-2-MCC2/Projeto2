// rotas públicas (PUBLIC_ENDPOINTS): quem chama ainda não tem login, por isso não há requireProfile

import { AuthController } from '../controllers/auth_controller.js'
import { SchemaHandler } from '../utils/schema_handler.js'

export class AuthResource {
  async onPostCadastro(req, res) {
    SchemaHandler.validate(req, 'post_auth_cadastro.json')

    const authController = new AuthController(req.context)
    const userDto = await authController.register(req.context.media)

    res.status(201).json(userDto)
  }

  async onPostLogin(req, res) {
    SchemaHandler.validate(req, 'post_auth_login.json')

    const authController = new AuthController(req.context)
    const loginDto = await authController.login(req.context.media)

    res.status(200).json(loginDto)
  }
}
