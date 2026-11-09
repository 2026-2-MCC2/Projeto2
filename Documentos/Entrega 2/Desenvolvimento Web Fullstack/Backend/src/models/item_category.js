import { DataTypes, Model } from 'sequelize'

import { sequelize } from '../connectors/database_connector.js'

export class ItemCategory extends Model {}

ItemCategory.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(50) },
    created_at: { type: DataTypes.DATE },
  },
  { sequelize, tableName: 'item_category', timestamps: false },
)
