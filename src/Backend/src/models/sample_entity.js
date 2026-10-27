// Model da tabela sample_entity: a entidade de EXEMPLO do boilerplate (use como modelo para as tabelas do projeto).
// (O que é um model está explicado em sample_entity_status.js.)
//
// Um objeto SampleEntity buscado com o status fica assim:
//   sampleEntity.id                   1
//   sampleEntity.sample_entity_key    '6f1c2a9e-...'
//   sampleEntity.sample_entity_data   { hello: 'world' }
//   sampleEntity.counter              0
//   sampleEntity.status_id            2
//   sampleEntity.status.enumerator    'pending'   (só vem se buscar com include: 'status')

import { DataTypes, Model } from 'sequelize'

import { sequelize } from '../connectors/database_connector.js'
import { SampleEntityStatus } from './sample_entity_status.js'

export class SampleEntity extends Model {}

SampleEntity.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    sample_entity_key: { type: DataTypes.STRING },
    // JSON guarda um objeto qualquer; aqui fica o body recebido no POST
    sample_entity_data: { type: DataTypes.JSON },
    counter: { type: DataTypes.INTEGER },
    status_id: { type: DataTypes.INTEGER },
  },
  { sequelize, tableName: 'sample_entity', timestamps: false },
)

// RELAÇÃO
// status_id guarda o id de uma linha da tabela sample_entity_status. O belongsTo ("pertence a")
// avisa isso ao Sequelize, e aí dá para buscar a entidade já com o status:
//   const sampleEntity = await SampleEntity.findOne({ where: { ... }, include: 'status' })
//   sampleEntity.status.enumerator   'pending'
SampleEntity.belongsTo(SampleEntityStatus, { as: 'status', foreignKey: 'status_id' })
