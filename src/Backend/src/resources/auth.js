// rotas públicas (PUBLIC_ENDPOINTS): quem chama ainda não tem login, por isso não há requireProfile

import { EmailConnector } from '../connectors/email_connector.js'
import { AuthController } from '../controllers/auth_controller.js'
import { PasswordResetController } from '../controllers/password_reset_controller.js'
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

  // responde igual exista ou não a conta, para ninguém descobrir quais e-mails estão cadastrados
  async onPostEsqueciSenha(req, res) {
    SchemaHandler.validate(req, 'post_auth_esqueci_senha.json')

    const controller = new PasswordResetController(req.context)
    const email = await controller.createResetEmailByEmail(req.context.media.email)

    res.status(202).end()
    if (email !== null) EmailConnector.sendInBackground(email)
  }

  async onPostRedefinirSenha(req, res) {
    SchemaHandler.validate(req, 'post_auth_redefinir_senha.json')

    const controller = new PasswordResetController(req.context)
    await controller.resetPassword(req.context.media)

    res.status(204).end()
  }

  async onPostVerificarCnpj(req, res) {
    SchemaHandler.validate(req, 'post_auth_verificar_cnpj.json')

    const authController = new AuthController(req.context)
    const availability = await authController.checkCnpjAvailability(req.context.media.cnpj)

    res.status(200).json(availability)
  }
}
