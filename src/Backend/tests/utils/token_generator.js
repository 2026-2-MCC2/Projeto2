// Gera tokens de login para os testes, assinados com a mesma chave local que a API usa.
// Assim os testes chamam rotas protegidas sem precisar de um endpoint de login.
//   TokenGenerator.create()                  token de um organizador
//   TokenGenerator.create('admin')           token de um admin
//   TokenGenerator.authorizationHeader()     { Authorization: 'Bearer <token>' }, pronto para a requisição

import { randomUUID } from 'node:crypto'

import jwt from 'jsonwebtoken'

import { LOCAL_JWT_SECRET } from './local_secrets.js'

export class TokenGenerator {
  static create(profile = 'organizador', { expiresIn = '1h' } = {}) {
    const tokenContent = { user_key: randomUUID(), profile: profile }
    return jwt.sign(tokenContent, LOCAL_JWT_SECRET, { expiresIn: expiresIn })
  }

  static authorizationHeader(profile) {
    return { Authorization: `Bearer ${TokenGenerator.create(profile)}` }
  }
}
