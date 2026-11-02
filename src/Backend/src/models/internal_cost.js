import { DataTypes, Model } from 'sequelize'

import { sequelize } from '../connectors/database_connector.js'
import { Event } from './event.js'

export class InternalCost extends Model {}

InternalCost.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    internal_cost_key: { type: DataTypes.STRING(36) },
    event_id: { type: DataTypes.INTEGER },
    type: { type: DataTypes.ENUM('tax', 'operational', 'other') },
    description: { type: DataTypes.STRING(255) },
    amount: { type: DataTypes.DECIMAL(12, 2) },
    created_at: { type: DataTypes.DATE },
  },
  { sequelize, tableName: 'internal_cost', timestamps: false },
)

InternalCost.belongsTo(Event, { as: 'event', foreignKey: 'event_id' })
Event.hasMany(InternalCost, { as: 'internal_costs', foreignKey: 'event_id' })
