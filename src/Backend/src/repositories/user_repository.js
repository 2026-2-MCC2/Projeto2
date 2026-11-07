import { randomUUID } from 'node:crypto'

import { QueryTypes } from 'sequelize'

import { sequelize } from '../connectors/database_connector.js'
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

  async getByIdForUpdate(id) {
    return User.findOne({
      where: { id },
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

  // dados da empresa junto, para a tela de configurações
  async getProfileByKey(userKey) {
    return User.findOne({
      where: { user_key: userKey },
      include: ['organizer', { association: 'supplier', include: ['categories'] }],
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

  // busca um registro a mais para saber se há próxima página
  async getStatusHistory(limit, offset) {
    return sequelize.query(
      `SELECT target.user_key, target.name, target.email, target.profile,
              user_status_event.old_status, user_status_event.new_status, user_status_event.reason,
              user_status_event.event_datetime, admin_user.name AS admin_name
       FROM user_status_event
       INNER JOIN user AS target ON target.id = user_status_event.user_id
       INNER JOIN user AS admin_user ON admin_user.id = user_status_event.admin_user_id
       ORDER BY user_status_event.event_datetime DESC, user_status_event.id DESC
       LIMIT :limitPlusOne OFFSET :offset`,
      { replacements: { limitPlusOne: limit + 1, offset }, transaction: this.session, type: QueryTypes.SELECT },
    )
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
