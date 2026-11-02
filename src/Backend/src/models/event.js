import { DataTypes, Model } from 'sequelize'

import { sequelize } from '../connectors/database_connector.js'
import { Organizer } from './organizer.js'

export class Event extends Model {}

Event.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    event_key: { type: DataTypes.STRING(36) },
    organizer_id: { type: DataTypes.INTEGER },
    name: { type: DataTypes.STRING(150) },
    category: { type: DataTypes.STRING(80) },
    description: { type: DataTypes.TEXT },
    venue_name: { type: DataTypes.STRING(150) },
    address: { type: DataTypes.STRING(200) },
    city: { type: DataTypes.STRING(100) },
    state: { type: DataTypes.STRING(2) },
    zip_code: { type: DataTypes.STRING(8) },
    venue_capacity: { type: DataTypes.INTEGER },
    start_date: { type: DataTypes.DATE },
    end_date: { type: DataTypes.DATE },
    min_audience: { type: DataTypes.INTEGER },
    expected_audience: { type: DataTypes.INTEGER },
    max_audience: { type: DataTypes.INTEGER },
    profit_margin: { type: DataTypes.DECIMAL(5, 4) },
    reference_scenario: { type: DataTypes.ENUM('minimum', 'expected', 'maximum') },
    status: { type: DataTypes.ENUM('draft', 'open_for_quotes', 'closed', 'canceled') },
    cancellation_reason: { type: DataTypes.STRING(500) },
    created_at: { type: DataTypes.DATE },
  },
  { sequelize, tableName: 'event', timestamps: false },
)

Event.belongsTo(Organizer, { as: 'organizer', foreignKey: 'organizer_id' })
Organizer.hasMany(Event, { as: 'events', foreignKey: 'organizer_id' })
