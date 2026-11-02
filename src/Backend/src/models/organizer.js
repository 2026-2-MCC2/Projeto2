// Model da tabela organizer: dados do usuário com perfil organizador (1 para 1 com user).

import { DataTypes, Model } from 'sequelize'

import { sequelize } from '../connectors/database_connector.js'
import { User } from './user.js'

export class Organizer extends Model {}

Organizer.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER },
    cnpj: { type: DataTypes.STRING(14) },
    phone: { type: DataTypes.STRING(20) },
    created_at: { type: DataTypes.DATE },
  },
  { sequelize, tableName: 'organizer', timestamps: false },
)

Organizer.belongsTo(User, { as: 'user', foreignKey: 'user_id' })

// hasOne = "tem um": cada usuário tem no máximo um organizador.
User.hasOne(Organizer, { as: 'organizer', foreignKey: 'user_id' })
