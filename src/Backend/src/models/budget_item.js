// Modelo Sequelize do item de custo vinculado a um evento e a uma categoria.

import { DataTypes, Model } from 'sequelize'

import { sequelize } from '../connectors/database_connector.js'
import { Event } from './event.js'
import { ItemCategory } from './item_category.js'

export class BudgetItem extends Model {}

BudgetItem.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    budget_item_key: { type: DataTypes.STRING(36) },
    event_id: { type: DataTypes.INTEGER },
    category_id: { type: DataTypes.INTEGER },
    description: { type: DataTypes.STRING(255) },
    type: { type: DataTypes.ENUM('product', 'service') },
    quantity: { type: DataTypes.INTEGER },
    estimated_value: { type: DataTypes.DECIMAL(12, 2) },
    notes: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE },
  },
  { sequelize, tableName: 'budget_item', timestamps: false },
)

BudgetItem.belongsTo(Event, { as: 'event', foreignKey: 'event_id' })
Event.hasMany(BudgetItem, { as: 'budget_items', foreignKey: 'event_id' })
BudgetItem.belongsTo(ItemCategory, { as: 'category', foreignKey: 'category_id' })
ItemCategory.hasMany(BudgetItem, { as: 'budget_items', foreignKey: 'category_id' })
