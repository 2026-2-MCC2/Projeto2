import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

import { SecretManagerConnector } from '../connectors/secret_manager_connector.js'
import { JWT_EXPIRATION, JWT_SECRET_NAME } from '../constants.js'
import { ForbiddenProfile, Unauthorized } from '../errors/index.js'

const BCRYPT_SALT_ROUNDS = 10

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

  static async generateUserToken({ userKey, profile }) {
    const secret = await SecurityTools.getJwtSecret()
    const tokenContent = { user_key: userKey, profile: profile }

    return jwt.sign(tokenContent, secret, { expiresIn: JWT_EXPIRATION })
  }

  static async readUserToken(token) {
    const secret = await SecurityTools.getJwtSecret()

    let tokenContent
    try {
      tokenContent = jwt.verify(token, secret)
    } catch {
      throw new Unauthorized()
    }

    return { userKey: tokenContent.user_key, profile: tokenContent.profile, issuedAt: tokenContent.iat }
  }

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
