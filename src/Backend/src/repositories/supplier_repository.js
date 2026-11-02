// Repository: consultas e gravações dos dados de fornecedor.

import { Supplier } from '../models/index.js'

export class SupplierRepository {
  constructor(context) {
    this.session = context.dbSession
  }

  // devolve o fornecedor com esse CNPJ, ou null se não existir
  async getByCnpj(cnpj) {
    return Supplier.findOne({
      where: { cnpj: cnpj },
      transaction: this.session,
    })
  }

  async create({ userId, cnpj, phone, serviceArea }) {
    return Supplier.create(
      {
        user_id: userId,
        cnpj: cnpj,
        service_area: serviceArea,
        phone: phone,
      },
      { transaction: this.session },
    )
  }
}
