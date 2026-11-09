// assina com a mesma chave local da api, para chamar rotas protegidas sem passar pelo login

import { randomUUID } from 'node:crypto'

import jwt from 'jsonwebtoken'

import { LOCAL_JWT_SECRET } from './local_secrets.js'

export class TokenGenerator {
  static create(profile = 'organizador', { expiresIn = '1h', userKey = randomUUID() } = {}) {
    const tokenContent = { user_key: userKey, profile: profile }
    return jwt.sign(tokenContent, LOCAL_JWT_SECRET, { expiresIn: expiresIn })
  }

  static authorizationHeader(profile, options) {
    return { Authorization: `Bearer ${TokenGenerator.create(profile, options)}` }
  }
}
