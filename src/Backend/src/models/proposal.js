import { DataTypes, Model } from 'sequelize'

import { sequelize } from '../connectors/database_connector.js'
import { BudgetItem } from './budget_item.js'
import { ProposalPhoto } from './proposal_photo.js'
import { Supplier } from './supplier.js'

export class Proposal extends Model {}

Proposal.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    proposal_key: { type: DataTypes.STRING(36) },
    budget_item_id: { type: DataTypes.INTEGER },
    supplier_id: { type: DataTypes.INTEGER },
    amount: { type: DataTypes.DECIMAL(12, 2) },
    description: { type: DataTypes.TEXT },
    not_included: { type: DataTypes.STRING(500) },
    delivery_terms: { type: DataTypes.STRING(255) },
    payment_terms: { type: DataTypes.STRING(255) },
    team: { type: DataTypes.STRING(255) },
    warranty: { type: DataTypes.STRING(255) },
    valid_until: { type: DataTypes.DATEONLY },
    notes: { type: DataTypes.TEXT },
    status: { type: DataTypes.ENUM('sent', 'under_review', 'accepted', 'rejected') },
    selected: { type: DataTypes.BOOLEAN },
    sent_at: { type: DataTypes.DATE },
  },
  { sequelize, tableName: 'proposal', timestamps: false },
)

Proposal.belongsTo(BudgetItem, { as: 'budget_item', foreignKey: 'budget_item_id' })
BudgetItem.hasMany(Proposal, { as: 'proposals', foreignKey: 'budget_item_id' })
Proposal.belongsTo(Supplier, { as: 'supplier', foreignKey: 'supplier_id' })
Supplier.hasMany(Proposal, { as: 'proposals', foreignKey: 'supplier_id' })
Proposal.hasMany(ProposalPhoto, { as: 'photos', foreignKey: 'proposal_id' })
ProposalPhoto.belongsTo(Proposal, { as: 'proposal', foreignKey: 'proposal_id' })
