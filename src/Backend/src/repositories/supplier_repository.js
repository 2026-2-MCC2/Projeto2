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

  async replaceCategories(supplierId, categories) {
    await SupplierCategory.destroy({ where: { supplier_id: supplierId }, transaction: this.session })
    await this.#linkCategories(supplierId, categories)
  }

  async #linkCategories(supplierId, categories) {
    const itemCategories = await ItemCategory.findAll({
      where: { name: categories },
      transaction: this.session,
    })
    await SupplierCategory.bulkCreate(
      itemCategories.map((category) => ({ supplier_id: supplierId, category_id: category.id })),
      { transaction: this.session },
    )
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

    await this.#linkCategories(supplier.id, categories)
    return supplier
  }
}
