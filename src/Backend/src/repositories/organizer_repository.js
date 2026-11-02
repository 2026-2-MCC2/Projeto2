// Repository: consultas e gravações dos dados de organizador.

import { Organizer } from '../models/index.js'

export class OrganizerRepository {
  constructor(context) {
    this.session = context.dbSession
  }

  // devolve o organizador com esse CNPJ, ou null se não existir
  async getByCnpj(cnpj) {
    return Organizer.findOne({
      where: { cnpj: cnpj },
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
