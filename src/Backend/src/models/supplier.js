// Model da tabela supplier: dados do usuário com perfil fornecedor (1 para 1 com user).

import { DataTypes, Model } from 'sequelize'

import { sequelize } from '../connectors/database_connector.js'
import { User } from './user.js'

export class Supplier extends Model {}

Supplier.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER },
    cnpj: { type: DataTypes.STRING(14) },
    service_area: { type: DataTypes.STRING(100) },
    phone: { type: DataTypes.STRING(20) },
    created_at: { type: DataTypes.DATE },
  },
  { sequelize, tableName: 'supplier', timestamps: false },
)

Supplier.belongsTo(User, { as: 'user', foreignKey: 'user_id' })

// hasOne = "tem um": cada usuário tem no máximo um fornecedor.
User.hasOne(Supplier, { as: 'supplier', foreignKey: 'user_id' })
