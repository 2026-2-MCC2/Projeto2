import { randomUUID } from 'node:crypto'

import { USER_PROFILES } from '../constants.js'
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

  async getByEmail(email) {
    return User.findOne({
      where: { email: email },
      transaction: this.session,
    })
  }

  // dados do cadastro e a última decisão do admin, para a tela de acompanhamento
  async getRegistrationSummary(userId) {
    return User.findByPk(userId, {
      include: [
        'organizer',
        { association: 'supplier', include: ['categories'] },
        { association: 'status_events', separate: true, order: [['id', 'DESC']], limit: 1 },
      ],
      transaction: this.session,
    })
  }

  // a conta nasce pending e só acessa depois da aprovação do admin
  async create({ name, email, passwordHash, profile }) {
    return User.create(
      {
        user_key: randomUUID(),
        name: name,
        email: email,
        password_hash: passwordHash,
        profile: profile,
        status: 'pending',
      },
      { transaction: this.session },
    )
  }

  // busca um item a mais que o limite só para saber se existe próxima página
  async getRegistrationList(limit, offset, status) {
    const where = { profile: [USER_PROFILES.ORGANIZER, USER_PROFILES.SUPPLIER] }
    if (status !== undefined) {
      where.status = status
    }

    return User.findAll({
      where: where,
      include: ['organizer', { association: 'supplier', include: ['categories'] }],
      order: [
        ['created_at', 'ASC'],
        ['id', 'ASC'],
      ],
      limit: limit + 1,
      offset: offset,
      transaction: this.session,
    })
  }

  async updateStatus(user, newStatus, reason = null) {
    const administrator = await User.findOne({
      where: {
        user_key: this.context.user.userKey,
        profile: 'admin',
        status: 'approved',
      },
      transaction: this.session,
    })

    // só registra a decisão se o token for de um admin aprovado no banco
    if (administrator === null) {
      return null
    }

    const oldStatus = user.status
    user.status = newStatus
    if (newStatus === 'approved' && user.approved_at === null) {
      user.approved_at = new Date()
    }
    await user.save({ transaction: this.session })

    await UserStatusEvent.create(
      {
        user_id: user.id,
        admin_user_id: administrator.id,
        old_status: oldStatus,
        new_status: newStatus,
        reason: reason,
        event_datetime: new Date(),
      },
      { transaction: this.session },
    )

    return user
  }
}
