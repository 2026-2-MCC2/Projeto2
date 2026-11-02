import { Organizer } from '../models/index.js'

export class OrganizerRepository {
  constructor(context) {
    this.session = context.dbSession
  }

  async getByCnpj(cnpj) {
    return Organizer.findOne({
      where: { cnpj: cnpj },
      transaction: this.session,
    })
  }

  async getByUserId(userId) {
    return Organizer.findOne({
      where: { user_id: userId },
      transaction: this.session,
    })
  }

  async create({ userId, cnpj, phone }) {
    return Organizer.create(
      {
        user_id: userId,
        cnpj: cnpj,
        phone: phone,
      },
      { transaction: this.session },
    )
  }
}
