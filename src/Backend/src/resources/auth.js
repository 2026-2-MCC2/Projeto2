// rotas públicas (PUBLIC_ENDPOINTS): quem chama ainda não tem login, por isso não há requireProfile

import { setTimeout } from 'node:timers/promises'

import { EmailConnector } from '../connectors/email_connector.js'
import { WebSocketHub } from '../connectors/websocket_hub.js'
import { FORGOT_PASSWORD_MIN_RESPONSE_MS } from '../constants.js'
import { AuthController } from '../controllers/auth_controller.js'
import { PasswordResetController } from '../controllers/password_reset_controller.js'
import { Logger } from '../utils/logger.js'
import { SchemaHandler } from '../utils/schema_handler.js'

export class AuthResource {
  async onPostCadastro(req, res) {
    SchemaHandler.validate(req, 'post_auth_cadastro.json')

    const authController = new AuthController(req.context)
    const { userDto, pushes } = await authController.register(req.context.media)

    res.status(201).json(userDto)
    WebSocketHub.send(pushes)
  }

  async onPostLogin(req, res) {
    SchemaHandler.validate(req, 'post_auth_login.json')

    const authController = new AuthController(req.context)
    const loginDto = await authController.login(req.context.media)

    res.status(200).json(loginDto)
  }

  // responde igual, e nunca antes do tempo mínimo, exista ou não a conta, para não revelar quais e-mails têm cadastro;
  // o link é gravado dentro da requisição porque no Cloud Run a CPU para depois da resposta
  async onPostEsqueciSenha(req, res) {
    SchemaHandler.validate(req, 'post_auth_esqueci_senha.json')
    const respondAt = Date.now() + FORGOT_PASSWORD_MIN_RESPONSE_MS

    let resetEmail = null
    try {
      resetEmail = await new PasswordResetController(req.context).createResetEmailByEmail(req.context.media.email)
    } catch (error) {
      // um erro só aconteceria com conta existente: vira log, e a resposta segue igual
      new Logger(req.context, 'AuthResource').error(`Forgot password failed: ${error.stack ?? error}`)
    }

    // a conexão volta ao pool antes da espera
    const dbSession = req.context.dbSession
    if (dbSession !== null && !dbSession.finished) await dbSession.rollback().catch(() => {})

    await setTimeout(Math.max(0, respondAt - Date.now()))
    res.status(202).end()
    if (resetEmail !== null) EmailConnector.sendInBackground(resetEmail)
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
