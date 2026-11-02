// Resource das rotas públicas de autenticação (autocadastro e login).
// Estas URLs estão em PUBLIC_ENDPOINTS (constants.js): não exigem o header Authorization, porque
// quem chama ainda não tem login. Por isso não há SecurityTools.requireProfile aqui.

import { AuthController } from '../controllers/auth_controller.js'
import { SchemaHandler } from '../utils/schema_handler.js'

export class AuthResource {
  // POST /event_planning/auth/cadastro
  //   curl -X POST localhost:3300/event_planning/auth/cadastro -H 'Content-Type: application/json' \
  //     -d '{"profile": "organizador", "name": "Maria", "email": "maria@exemplo.com", "password": "senhaForte123",
  //          "cnpj": "11.222.333/0001-81", "phone": "(11) 99999-8888"}'
  //   201 { "user_key": "6f1c2a9e-...", "profile": "organizador", "status": "pending" }
  //   400 { "code": "APP000001", ... } se o body não seguir o schema
  //   400 { "code": "EVP000007", ... } se o CNPJ for inválido
  //   409 { "code": "EVP000005", ... } se o e-mail já estiver cadastrado
  //   409 { "code": "EVP000006", ... } se o CNPJ já estiver cadastrado
  async onPostCadastro(req, res) {
    SchemaHandler.validate(req, 'post_auth_cadastro.json')

    const authController = new AuthController(req.context)
    const userDto = await authController.register(req.context.media)

    res.status(201).json(userDto)
  }

  // POST /event_planning/auth/login
  //   curl -X POST localhost:3300/event_planning/auth/login -H 'Content-Type: application/json' \
  //     -d '{"email": "maria@exemplo.com", "password": "senhaForte123"}'
  //   200 { "token": "eyJ...", "user": { "user_key": "6f1c2a9e-...", "name": "Maria", "profile": "organizador" } }
  //   400 { "code": "APP000001", ... } se o body não seguir o schema
  //   401 { "code": "EVP000008", ... } se o e-mail não existir ou a senha estiver errada (mesmo erro nos dois casos)
  //   403 { "code": "EVP000009", ... } se o cadastro ainda estiver pendente
  //   403 { "code": "EVP000010", ... } se o cadastro tiver sido rejeitado
  async onPostLogin(req, res) {
    SchemaHandler.validate(req, 'post_auth_login.json')

    const authController = new AuthController(req.context)
    const loginDto = await authController.login(req.context.media)

    res.status(200).json(loginDto)
  }
}
