import { DataTypes, Model } from 'sequelize'

import { sequelize } from '../connectors/database_connector.js'
import { User } from './user.js'

export class PasswordResetToken extends Model {}

PasswordResetToken.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER },
    token_hash: { type: DataTypes.STRING(64) },
    expires_at: { type: DataTypes.DATE },
    used_at: { type: DataTypes.DATE },
    created_at: { type: DataTypes.DATE },
  },
  { sequelize, tableName: 'password_reset_token', timestamps: false },
)

PasswordResetToken.belongsTo(User, { as: 'user', foreignKey: 'user_id' })
