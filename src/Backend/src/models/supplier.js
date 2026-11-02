import { DataTypes, Model } from 'sequelize'

import { sequelize } from '../connectors/database_connector.js'
import { User } from './user.js'

export class Supplier extends Model {}

Supplier.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER },
    cnpj: { type: DataTypes.STRING(14) },
    phone: { type: DataTypes.STRING(20) },
    responsible_name: { type: DataTypes.STRING(150) },
    city: { type: DataTypes.STRING(100) },
    state: { type: DataTypes.STRING(2) },
    created_at: { type: DataTypes.DATE },
  },
  { sequelize, tableName: 'supplier', timestamps: false },
)

Supplier.belongsTo(User, { as: 'user', foreignKey: 'user_id' })

User.hasOne(Supplier, { as: 'supplier', foreignKey: 'user_id' })
