import { DataTypes, Model } from 'sequelize'

import { sequelize } from '../connectors/database_connector.js'

export class ProposalPhoto extends Model {}

ProposalPhoto.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    proposal_id: { type: DataTypes.INTEGER },
    position: { type: DataTypes.TINYINT },
    url: { type: DataTypes.STRING(500) },
    created_at: { type: DataTypes.DATE },
  },
  { sequelize, tableName: 'proposal_photo', timestamps: false },
)
