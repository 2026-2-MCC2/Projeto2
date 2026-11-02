// Model da tabela user_status_event: auditoria de decisões administrativas sobre usuários.

import { DataTypes, Model } from 'sequelize'

import { sequelize } from '../connectors/database_connector.js'
import { User } from './user.js'

export class UserStatusEvent extends Model {}

UserStatusEvent.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER },
    admin_user_id: { type: DataTypes.INTEGER },
    old_status: { type: DataTypes.ENUM('pending', 'approved', 'rejected') },
    new_status: { type: DataTypes.ENUM('pending', 'approved', 'rejected') },
    event_datetime: { type: DataTypes.DATE },
    created_at: { type: DataTypes.DATE },
  },
  { sequelize, tableName: 'user_status_event', timestamps: false },
)

UserStatusEvent.belongsTo(User, { as: 'user', foreignKey: 'user_id' })
UserStatusEvent.belongsTo(User, { as: 'administrator', foreignKey: 'admin_user_id' })

User.hasMany(UserStatusEvent, { as: 'status_events', foreignKey: 'user_id' })
User.hasMany(UserStatusEvent, { as: 'admin_status_events', foreignKey: 'admin_user_id' })
