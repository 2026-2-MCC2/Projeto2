import { ItemCategory, Supplier, SupplierCategory } from '../models/index.js'

export class SupplierRepository {
  constructor(context) {
    this.session = context.dbSession
  }

  async getByCnpj(cnpj) {
    return Supplier.findOne({
      where: { cnpj: cnpj },
      transaction: this.session,
    })
  }

  // categories são nomes da tabela item_category
  async create({ userId, cnpj, phone, categories }) {
    const supplier = await Supplier.create(
      {
        user_id: userId,
        cnpj: cnpj,
        phone: phone,
      },
      { transaction: this.session },
    )

    const itemCategories = await ItemCategory.findAll({
      where: { name: categories },
      transaction: this.session,
    })
    await SupplierCategory.bulkCreate(
      itemCategories.map((category) => ({ supplier_id: supplier.id, category_id: category.id })),
      { transaction: this.session },
    )

    return supplier
  }
}
