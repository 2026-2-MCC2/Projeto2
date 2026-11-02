import { Op } from 'sequelize'

import { PasswordResetToken } from '../models/index.js'

export class PasswordResetTokenRepository {
  constructor(context) {
    this.session = context.dbSession
  }

  async getLatestByUserId(userId) {
    return PasswordResetToken.findOne({
      where: { user_id: userId },
      order: [['id', 'DESC']],
      transaction: this.session,
    })
  }

  async create({ userId, tokenHash, expiresAt }) {
    return PasswordResetToken.create(
      { user_id: userId, token_hash: tokenHash, expires_at: expiresAt, created_at: new Date() },
      { transaction: this.session },
    )
  }

  // trava a linha: dois envios do mesmo link ao mesmo tempo não conseguem usar o token duas vezes
  async getUsableByHashForUpdate(tokenHash) {
    return PasswordResetToken.findOne({
      where: { token_hash: tokenHash, used_at: null, expires_at: { [Op.gt]: new Date() } },
      include: ['user'],
      lock: this.session.LOCK.UPDATE,
      transaction: this.session,
    })
  }

  // usar um link invalida todos os outros que ainda estavam abertos para a mesma conta
  async markAllAsUsed(userId) {
    await PasswordResetToken.update({ used_at: new Date() }, { where: { user_id: userId, used_at: null }, transaction: this.session })
  }
}
