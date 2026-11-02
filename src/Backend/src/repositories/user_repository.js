// Repository: consultas e gravações da conta de usuário e de seu histórico de decisões.

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

  // devolve o usuário com esse e-mail, ou null se não existir
  async getByEmail(email) {
    return User.findOne({
      where: { email: email },
      transaction: this.session,
    })
  }

  // cria a conta sempre como 'pending': só passa a acessar depois da aprovação do administrador
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

  // Lista paginada de organizadores e fornecedores (nunca admins), do cadastro mais antigo para o
  // mais novo, já com os dados de organizer/supplier. Se status vier, filtra por ele.
  // Busca um item a mais que o limite só para saber se existe próxima página.
  async getRegistrationList(limit, offset, status) {
    const where = { profile: [USER_PROFILES.ORGANIZER, USER_PROFILES.SUPPLIER] }
    if (status !== undefined) {
      where.status = status
    }

    return User.findAll({
      where: where,
      include: ['organizer', 'supplier'],
      order: [
        ['created_at', 'ASC'],
        ['id', 'ASC'],
      ],
      limit: limit + 1,
      offset: offset,
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
