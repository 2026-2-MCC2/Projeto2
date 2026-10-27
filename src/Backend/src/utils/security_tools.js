// Ferramentas de segurança: senha, token de login (JWT) e permissão por perfil.
//
// SENHA (bcrypt)
// A senha NUNCA é guardada como o usuário digitou. Guardamos um "hash": um texto embaralhado que
// não dá para desfazer. No login, embaralhamos a senha digitada de novo e comparamos os hashes.
// Se o banco vazar, ninguém descobre as senhas.
//   const passwordHash = await SecurityTools.hashPassword('minhaSenha123')   // salve isto no banco
//   const isCorrect = await SecurityTools.checkPassword('minhaSenha123', passwordHash)   // true
//
// TOKEN DE LOGIN (JWT)
// Depois do login, a API devolve um token: um texto assinado com uma chave secreta que só a API
// conhece. O front-end guarda o token e manda em toda requisição, no header:
//   Authorization: Bearer <token>
// Como o token é assinado, ninguém consegue alterar o conteúdo (ex.: trocar o perfil para admin)
// sem que a assinatura deixe de bater.
//   const token = await SecurityTools.generateUserToken({ userKey: usuario.usuario_key, profile: usuario.perfil })
//   const user = await SecurityTools.readUserToken(token)   // { userKey: '...', profile: 'organizador' }
// Atenção: o conteúdo do token pode ser LIDO por qualquer um (só não pode ser alterado). Nunca
// coloque senha ou dado sensível dentro dele.
//
// PERMISSÃO POR PERFIL
// No começo do método do resource, diga quais perfis podem usar a rota:
//   SecurityTools.requireProfile(req.context, [USER_PROFILES.ORGANIZER])
// Se o usuário logado tiver outro perfil, a requisição para ali com 403.

import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

import { SecretManagerConnector } from '../connectors/secret_manager_connector.js'
import { JWT_EXPIRATION, JWT_SECRET_NAME } from '../constants.js'
import { ForbiddenProfile, Unauthorized } from '../errors/index.js'

// Quantas vezes o bcrypt embaralha a senha (2^10 rodadas). Quanto maior, mais seguro e mais lento.
// 10 é o valor recomendado pela própria biblioteca.
const BCRYPT_SALT_ROUNDS = 10

// A chave do JWT é buscada no Secret Manager uma vez e fica guardada em memória.
class JwtSecretCache {
  static secret = null
}

export class SecurityTools {
  static async hashPassword(plainPassword) {
    return bcrypt.hash(plainPassword, BCRYPT_SALT_ROUNDS)
  }

  static async checkPassword(plainPassword, passwordHash) {
    return bcrypt.compare(plainPassword, passwordHash)
  }

  // Cria o token de login. Use a chave pública do usuário (UUID), nunca o id numérico do banco.
  static async generateUserToken({ userKey, profile }) {
    const secret = await SecurityTools.getJwtSecret()
    const tokenContent = { user_key: userKey, profile: profile }

    return jwt.sign(tokenContent, secret, { expiresIn: JWT_EXPIRATION })
  }

  // Lê e confere o token. Se a assinatura não bater ou o token tiver vencido, lança Unauthorized (401).
  static async readUserToken(token) {
    const secret = await SecurityTools.getJwtSecret()

    let tokenContent
    try {
      tokenContent = jwt.verify(token, secret)
    } catch {
      throw new Unauthorized()
    }

    return { userKey: tokenContent.user_key, profile: tokenContent.profile }
  }

  // Barra a requisição (403) se o perfil do usuário logado não estiver na lista de perfis permitidos.
  static requireProfile(context, allowedProfiles) {
    const isAllowed = allowedProfiles.includes(context.user.profile)
    if (!isAllowed) {
      throw new ForbiddenProfile()
    }
  }

  static async getJwtSecret() {
    if (JwtSecretCache.secret === null) {
      JwtSecretCache.secret = await SecretManagerConnector.getSecretByName(JWT_SECRET_NAME)
    }
    return JwtSecretCache.secret
  }
}
