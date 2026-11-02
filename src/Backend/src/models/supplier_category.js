import { DataTypes, Model } from 'sequelize'

import { sequelize } from '../connectors/database_connector.js'
import { ItemCategory } from './item_category.js'
import { Supplier } from './supplier.js'

export class SupplierCategory extends Model {}

SupplierCategory.init(
  {
    supplier_id: { type: DataTypes.INTEGER, primaryKey: true },
    category_id: { type: DataTypes.INTEGER, primaryKey: true },
    created_at: { type: DataTypes.DATE },
  },
  { sequelize, tableName: 'supplier_category', timestamps: false },
)

Supplier.belongsToMany(ItemCategory, {
  through: SupplierCategory,
  as: 'categories',
  foreignKey: 'supplier_id',
  otherKey: 'category_id',
})
