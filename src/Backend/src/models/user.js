// Model da tabela user: conta e perfil de quem acessa o TrocaTicket.

import { DataTypes, Model } from 'sequelize'

import { sequelize } from '../connectors/database_connector.js'

export class User extends Model {}

User.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_key: { type: DataTypes.STRING(36) },
    name: { type: DataTypes.STRING(150) },
    email: { type: DataTypes.STRING(150) },
    password_hash: { type: DataTypes.STRING(100) },
    profile: { type: DataTypes.ENUM('admin', 'organizador', 'fornecedor') },
    status: { type: DataTypes.ENUM('pending', 'approved', 'rejected') },
    approved_at: { type: DataTypes.DATE },
    created_at: { type: DataTypes.DATE },
  },
  { sequelize, tableName: 'user', timestamps: false },
)
