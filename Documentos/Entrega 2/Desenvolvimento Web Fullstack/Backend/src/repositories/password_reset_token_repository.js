import { Op } from 'sequelize'

import { PasswordResetToken } from '../models/index.js'

export class PasswordResetTokenRepository {
  constructor(context) {
    this.session = context.dbSession
  }

  // leitura com trava (FOR SHARE): enxerga o token que outra transação acabou de gravar, o que a leitura
  // comum não faz depois da primeira consulta da transação (REPEATABLE READ)
  async getLatestByUserIdForShare(userId) {
    return PasswordResetToken.findOne({
      where: { user_id: userId },
      order: [['id', 'DESC']],
      lock: this.session.LOCK.SHARE,
      transaction: this.session,
    })
  }

  async create({ userId, tokenHash, expiresAt }) {
    return PasswordResetToken.create(
      { user_id: userId, token_hash: tokenHash, expires_at: expiresAt, created_at: new Date() },
      { transaction: this.session },
    )
  }

  async getUsableByHash(tokenHash) {
    return PasswordResetToken.findOne({
      where: usableByHash(tokenHash),
      transaction: this.session,
    })
  }

  // trava a linha: dois envios do mesmo link ao mesmo tempo não conseguem usar o token duas vezes
  async getUsableByHashForUpdate(tokenHash) {
    return PasswordResetToken.findOne({
      where: usableByHash(tokenHash),
      lock: this.session.LOCK.UPDATE,
      transaction: this.session,
    })
  }

  // usar um link invalida todos os outros que ainda estavam abertos para a mesma conta
  async markAllAsUsed(userId) {
    await PasswordResetToken.update({ used_at: new Date() }, { where: { user_id: userId, used_at: null }, transaction: this.session })
  }
}

function usableByHash(tokenHash) {
  return { token_hash: tokenHash, used_at: null, expires_at: { [Op.gt]: new Date() } }
}
