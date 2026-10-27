// Model da tabela sample_entity_status: os status possíveis de uma SampleEntity
// ('created', 'pending', 'success', 'failed'). A tabela é criada e preenchida pelo database/database.sql.
//
// MODEL
// Um model é uma classe que representa uma tabela. Cada linha da tabela vira um objeto da classe,
// e cada coluna vira um atributo do objeto:
//   const status = await SampleEntityStatus.findOne({ where: { enumerator: 'pending' } })
//   status.id          2
//   status.enumerator  'pending'
//
// No init() listamos as colunas que o código usa. Elas precisam existir no database.sql.
// timestamps: false avisa o Sequelize que a tabela não tem as colunas createdAt/updatedAt dele.

import { DataTypes, Model } from 'sequelize'

import { sequelize } from '../connectors/database_connector.js'

export class SampleEntityStatus extends Model {}

SampleEntityStatus.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    enumerator: { type: DataTypes.STRING },
  },
  { sequelize, tableName: 'sample_entity_status', timestamps: false },
)
