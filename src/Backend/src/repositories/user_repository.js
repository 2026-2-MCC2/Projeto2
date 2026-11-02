// Repository: consultas e gravações da conta de usuário e de seu histórico de decisões.

import { User, UserStatusEvent } from '../models/index.js'

export class UserRepository {
  constructor(context) {
    this.context = context
    this.session = context.dbSession
  }

  async getByKeyForUpdate(userKey) {
    return User.findOne({
      where: { user_key: userKey },
      lock: this.session.LOCK.UPDATE,
      transaction: this.session,
    })
  }

  async getByKey(userKey) {
    return User.findOne({
      where: { user_key: userKey },
      transaction: this.session,
    })
  }

  async updateStatus(user, newStatus) {
    const administrator = await User.findOne({
      where: {
        user_key: this.context.user.userKey,
        profile: 'admin',
        status: 'approved',
      },
      transaction: this.session,
    })

    // Só registra uma decisão quando o token corresponde a um administrador aprovado no banco.
    if (administrator === null) {
      return null
    }

    const oldStatus = user.status
    user.status = newStatus
    user.approved_at = newStatus === 'approved' ? new Date() : null
    await user.save({ transaction: this.session })

    await UserStatusEvent.create(
      {
        user_id: user.id,
        admin_user_id: administrator.id,
        old_status: oldStatus,
        new_status: newStatus,
        event_datetime: new Date(),
      },
      { transaction: this.session },
    )

    return user
  }
}
