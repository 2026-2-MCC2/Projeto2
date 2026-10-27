// Model da tabela sample_entity_status_event: histórico de mudanças de status.
// Toda vez que o status de uma SampleEntity muda, o repository grava uma linha aqui.

import { DataTypes, Model } from 'sequelize'

import { sequelize } from '../connectors/database_connector.js'
import { SampleEntity } from './sample_entity.js'
import { SampleEntityStatus } from './sample_entity_status.js'

export class SampleEntityStatusEvent extends Model {}

SampleEntityStatusEvent.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    sample_entity_id: { type: DataTypes.INTEGER },
    status_id: { type: DataTypes.INTEGER },
    event_datetime: { type: DataTypes.DATE },
  },
  { sequelize, tableName: 'sample_entity_status_event', timestamps: false },
)

// Cada evento pertence a uma entidade e a um status.
SampleEntityStatusEvent.belongsTo(SampleEntity, { as: 'sample_entity', foreignKey: 'sample_entity_id' })
SampleEntityStatusEvent.belongsTo(SampleEntityStatus, { as: 'status', foreignKey: 'status_id' })

// E uma entidade tem vários eventos (hasMany = "tem muitos"). Permite buscar o histórico junto:
//   await SampleEntity.findOne({ where: { ... }, include: 'status_events' })
SampleEntity.hasMany(SampleEntityStatusEvent, { as: 'status_events', foreignKey: 'sample_entity_id' })
