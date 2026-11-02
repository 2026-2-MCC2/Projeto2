import { createHash, randomBytes } from 'node:crypto'

import {
  FRONT_URL,
  PASSWORD_RESET_COOLDOWN_SECONDS,
  PASSWORD_RESET_EXPIRATION_MINUTES,
  USER_PROFILES,
  USER_STATUSES,
} from '../constants.js'
import { InvalidPasswordResetToken, NotFoundUser, UserStatusConflict } from '../errors/index.js'
import { PasswordResetTokenRepository } from '../repositories/password_reset_token_repository.js'
import { UserRepository } from '../repositories/user_repository.js'
import { EmailTemplates } from '../utils/email_templates.js'
import { SecurityTools } from '../utils/security_tools.js'
import { TextTools } from '../utils/text_tools.js'
import { BaseController } from './base_controller.js'

const hashToken = (token) => createHash('sha256').update(token).digest('hex')

function expirationText(minutes) {
  if (minutes % 60 === 0) return minutes === 60 ? '1 hora' : `${minutes / 60} horas`
  return `${minutes} minutos`
}

export class PasswordResetController extends BaseController {
  constructor(context) {
    super(context, 'PasswordResetController')
    this.userRepository = new UserRepository(context)
    this.tokenRepository = new PasswordResetTokenRepository(context)
  }

  // pedido feito pela própria pessoa; devolve null quando não há o que enviar, sem dizer o motivo
  async createResetEmailByEmail(email) {
    const user = await this.userRepository.getByEmail(TextTools.normalizeEmail(email))
    if (user === null || user.status !== USER_STATUSES.APPROVED) return null
    return this.createResetEmail(user)
  }

  // pedido feito pelo admin para um organizador ou fornecedor aprovado
  async createResetEmailByUserKey(userKey) {
    const user = await this.userRepository.getByKey(userKey)
    if (user === null) throw new NotFoundUser(userKey)

    const isResettable = user.profile !== USER_PROFILES.ADMIN && user.status === USER_STATUSES.APPROVED
    if (!isResettable) throw new UserStatusConflict(user.status, 'password_reset')

    return this.createResetEmail(user)
  }

  async createResetEmail(user) {
    const latestToken = await this.tokenRepository.getLatestByUserId(user.id)
    const secondsSinceLatest = latestToken ? (Date.now() - latestToken.created_at.getTime()) / 1000 : Infinity
    if (secondsSinceLatest < PASSWORD_RESET_COOLDOWN_SECONDS) return null

    const token = randomBytes(32).toString('base64url')
    await this.tokenRepository.create({
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + PASSWORD_RESET_EXPIRATION_MINUTES * 60_000),
    })
    await this.session.commit()

    const content = EmailTemplates.render('password_reset', {
      nome: user.name,
      link: `${FRONT_URL}/redefinir-senha?token=${token}`,
      validade: expirationText(PASSWORD_RESET_EXPIRATION_MINUTES),
    })
    return { to: user.email, ...content }
  }

  async resetPassword({ token, password }) {
    const resetToken = await this.tokenRepository.getUsableByHashForUpdate(hashToken(token))
    if (resetToken === null || resetToken.user.status !== USER_STATUSES.APPROVED) {
      throw new InvalidPasswordResetToken()
    }

    const user = resetToken.user
    user.password_hash = await SecurityTools.hashPassword(password)
    user.password_changed_at = new Date()
    await user.save({ transaction: this.session })
    await this.tokenRepository.markAllAsUsed(user.id)
    await this.session.commit()
  }
}
