// Grava as propostas dos fornecedores e consulta as recebidas para os itens de um evento.

import { randomUUID } from 'node:crypto'

import { QueryTypes } from 'sequelize'

import { sequelize } from '../connectors/database_connector.js'
import { ProposalDecisionConflict, ProposalExpired } from '../errors/index.js'
import { Proposal, ProposalPhoto } from '../models/index.js'

// "hoje" no horário de Brasília (sem horário de verão desde 2019), o mesmo dia que o fornecedor vê na tela
export const TODAY_IN_BRAZIL = "DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '-03:00'))"

// colunas e junções das propostas vistas pelo próprio fornecedor (histórico e detalhe)
const SUPPLIER_PROPOSAL_COLUMNS = `proposal.proposal_key, proposal.id AS position_id, proposal.amount,
       DATE_FORMAT(proposal.valid_until, '%Y-%m-%d') AS valid_until, proposal.status, proposal.selected, proposal.sent_at,
       event.event_key, event.name AS event_name, event.status AS event_status,
       event.cancellation_reason AS event_cancellation_reason,
       budget_item.budget_item_key AS item_key, budget_item.description AS item_description,
       item_category.name AS item_category`

const SUPPLIER_PROPOSAL_JOINS = `FROM proposal
       INNER JOIN budget_item ON budget_item.id = proposal.budget_item_id
       INNER JOIN event ON event.id = budget_item.event_id
       INNER JOIN item_category ON item_category.id = budget_item.category_id`

export class ProposalRepository {
  constructor(context) {
    this.session = context.dbSession
  }

  async getByEventId(eventId) {
    return sequelize.query(
      `SELECT budget_item.budget_item_key, budget_item.description AS item_description,
              item_category.name AS item_category, budget_item.estimated_value AS item_estimated_value,
              proposal.proposal_key, supplier_user.name AS supplier_name, supplier.cnpj AS supplier_cnpj, proposal.amount,
              DATE_FORMAT(proposal.valid_until, '%Y-%m-%d') AS valid_until, proposal.notes, proposal.status,
              proposal.description, proposal.not_included, proposal.delivery_terms, proposal.payment_terms,
              proposal.team, proposal.warranty,
              CASE WHEN proposal.valid_until < ${TODAY_IN_BRAZIL} THEN TRUE ELSE FALSE END AS is_expired,
              event_total.total_cost
       FROM event
       CROSS JOIN (
         SELECT (SELECT COALESCE(SUM(internal_cost.amount), 0)
                 FROM internal_cost WHERE internal_cost.event_id = :eventId) +
                (SELECT COALESCE(SUM(accepted_proposal.amount), 0)
                 FROM budget_item AS accepted_item
                 INNER JOIN proposal AS accepted_proposal ON accepted_proposal.budget_item_id = accepted_item.id
                 WHERE accepted_item.event_id = :eventId AND accepted_proposal.status = 'accepted') AS total_cost
       ) AS event_total
       LEFT JOIN budget_item ON budget_item.event_id = event.id
       LEFT JOIN item_category ON item_category.id = budget_item.category_id
       LEFT JOIN proposal ON proposal.budget_item_id = budget_item.id
       LEFT JOIN supplier ON supplier.id = proposal.supplier_id
       LEFT JOIN user AS supplier_user ON supplier_user.id = supplier.user_id
       WHERE event.id = :eventId
       ORDER BY budget_item.created_at ASC, budget_item.id ASC,
                proposal.amount ASC, proposal.id ASC`,
      { replacements: { eventId }, transaction: this.session, type: QueryTypes.SELECT },
    )
  }

  // depois do aceite o item para de receber propostas; o organizador ainda troca entre as recebidas.
  // FOR SHARE lê o que já foi confirmado: a leitura comum usa a foto do banco do começo da transação
  // e não veria um aceite gravado enquanto o envio esperava a trava do item
  async hasAcceptedProposal(budgetItemId) {
    const [row] = await sequelize.query(
      `SELECT COUNT(*) AS accepted FROM proposal WHERE budget_item_id = :budgetItemId AND status = 'accepted' FOR SHARE`,
      { replacements: { budgetItemId }, transaction: this.session, type: QueryTypes.SELECT },
    )
    return Number(row.accepted) > 0
  }

  async getBySupplierAndItem(supplierId, budgetItemId) {
    return Proposal.findOne({
      where: { supplier_id: supplierId, budget_item_id: budgetItemId },
      transaction: this.session,
    })
  }

  // a proposta nasce enviada e não selecionada; o organizador decide depois (acceptByProposalKey)
  async create(supplierId, budgetItemId, fields) {
    return Proposal.create(
      {
        proposal_key: randomUUID(),
        budget_item_id: budgetItemId,
        supplier_id: supplierId,
        ...fields,
        status: 'sent',
        selected: false,
        sent_at: new Date(),
      },
      { transaction: this.session },
    )
  }

  // histórico do fornecedor, da proposta mais recente para a mais antiga; status opcional
  async getSupplierProposals(supplierId, { status, limit, offset }) {
    const replacements = { supplierId, status: status ?? null, limit, offset }

    const [countResult] = await sequelize.query(
      `SELECT COUNT(*) AS total
       FROM proposal
       WHERE proposal.supplier_id = :supplierId AND (:status IS NULL OR proposal.status = :status)`,
      { replacements, transaction: this.session, type: QueryTypes.SELECT },
    )

    const proposals = await sequelize.query(
      `SELECT ${SUPPLIER_PROPOSAL_COLUMNS}
       ${SUPPLIER_PROPOSAL_JOINS}
       WHERE proposal.supplier_id = :supplierId AND (:status IS NULL OR proposal.status = :status)
       ORDER BY proposal.sent_at DESC, proposal.id DESC
       LIMIT :limit OFFSET :offset`,
      { replacements, transaction: this.session, type: QueryTypes.SELECT },
    )

    return { proposals, total: Number(countResult.total) }
  }

  // próxima página a partir da última proposta mostrada: proposta nova ou retirada no meio não desloca
  // a lista. Busca uma a mais para saber se ainda há página depois.
  // o cursor guarda a posição da última mostrada (data e id), então funciona mesmo se ela for retirada
  async getSupplierProposalsAfter(supplierId, { status, limit, cursor }) {
    return sequelize.query(
      `SELECT ${SUPPLIER_PROPOSAL_COLUMNS}
       ${SUPPLIER_PROPOSAL_JOINS}
       WHERE proposal.supplier_id = :supplierId AND (:status IS NULL OR proposal.status = :status)
         AND (proposal.sent_at < :sentAt OR (proposal.sent_at = :sentAt AND proposal.id < :proposalId))
       ORDER BY proposal.sent_at DESC, proposal.id DESC
       LIMIT :limitPlusOne`,
      {
        replacements: {
          supplierId,
          status: status ?? null,
          sentAt: cursor.sentAt,
          proposalId: cursor.proposalId,
          limitPlusOne: limit + 1,
        },
        transaction: this.session,
        type: QueryTypes.SELECT,
      },
    )
  }

  // quantas propostas o fornecedor tem em cada status, sem o filtro da lista (os cartões do topo)
  async getSupplierProposalCounts(supplierId) {
    return sequelize.query(`SELECT status, COUNT(*) AS total FROM proposal WHERE supplier_id = :supplierId GROUP BY status`, {
      replacements: { supplierId },
      transaction: this.session,
      type: QueryTypes.SELECT,
    })
  }

  // proposta do próprio fornecedor com evento e item; de outro fornecedor volta null
  async getSupplierProposalByKey(supplierId, proposalKey) {
    const proposals = await sequelize.query(
      `SELECT ${SUPPLIER_PROPOSAL_COLUMNS},
              proposal.id, event.id AS event_id, event.end_date AS event_end_date,
              budget_item.type AS item_type, budget_item.quantity AS item_quantity,
              proposal.description, proposal.not_included, proposal.delivery_terms, proposal.payment_terms,
              proposal.team, proposal.warranty, proposal.notes, budget_item.estimated_value AS item_estimated_value,
              organizer_user.name AS organizer_name, organizer_user.email AS organizer_email, organizer.phone AS organizer_phone
       ${SUPPLIER_PROPOSAL_JOINS}
       INNER JOIN organizer ON organizer.id = event.organizer_id
       INNER JOIN user AS organizer_user ON organizer_user.id = organizer.user_id
       WHERE proposal.supplier_id = :supplierId AND proposal.proposal_key = :proposalKey`,
      { replacements: { supplierId, proposalKey }, transaction: this.session, type: QueryTypes.SELECT },
    )
    return proposals[0] ?? null
  }

  // com lock, a leitura enxerga as fotos que outra requisição acabou de gravar (a leitura comum usa a
  // foto do banco tirada no começo da transação)
  async getPhotos(proposalId, { lock = false } = {}) {
    const forUpdate = lock ? ' FOR UPDATE' : ''
    return sequelize.query(`SELECT position, url FROM proposal_photo WHERE proposal_id = :proposalId ORDER BY position ASC${forUpdate}`, {
      replacements: { proposalId },
      transaction: this.session,
      type: QueryTypes.SELECT,
    })
  }

  async createPhoto(proposalId, position, path) {
    await ProposalPhoto.create(
      { proposal_id: proposalId, position: position, url: path, created_at: new Date() },
      { transaction: this.session },
    )
  }

  // a foto da proposta guardada num destes caminhos (um por formato aceito, ver proposal_photo_tools.js)
  async getPhotoByPaths(proposalId, paths) {
    return ProposalPhoto.findOne({ where: { proposal_id: proposalId, url: paths }, transaction: this.session })
  }

  async deletePhoto(photo) {
    await photo.destroy({ transaction: this.session })
  }

  // fotos de todas as propostas de um evento, para a comparação do organizador
  async getPhotosByEventId(eventId) {
    return sequelize.query(
      `SELECT proposal.proposal_key, proposal_photo.position, proposal_photo.url
       FROM proposal_photo
       INNER JOIN proposal ON proposal.id = proposal_photo.proposal_id
       INNER JOIN budget_item ON budget_item.id = proposal.budget_item_id
       WHERE budget_item.event_id = :eventId
       ORDER BY proposal_photo.proposal_id ASC, proposal_photo.position ASC`,
      { replacements: { eventId }, transaction: this.session, type: QueryTypes.SELECT },
    )
  }

  // trava a proposta até o commit: um aceite do organizador ao mesmo tempo espera, e vice-versa
  async getSupplierProposalForUpdate(supplierId, proposalKey) {
    return Proposal.findOne({
      where: { supplier_id: supplierId, proposal_key: proposalKey },
      lock: this.session.LOCK.UPDATE,
      transaction: this.session,
    })
  }

  async update(proposal, fields) {
    proposal.set(fields)
    await proposal.save({ transaction: this.session })
  }

  // as fotos da proposta saem junto (ON DELETE CASCADE em proposal_photo)
  async delete(proposal) {
    await proposal.destroy({ transaction: this.session })
  }

  // propostas ainda em jogo (enviada, em análise ou aceita), com o fornecedor que precisa saber do cancelamento.
  // trava só as propostas: as linhas de item, fornecedor e usuário da junção ficam livres
  async getOpenProposalsOfEventForUpdate(eventId) {
    return sequelize.query(
      `SELECT proposal.id, proposal.proposal_key, proposal.status, proposal.amount, budget_item.description AS item_description,
              supplier_user.name AS supplier_name, supplier_user.email AS supplier_email
       FROM proposal
       INNER JOIN budget_item ON budget_item.id = proposal.budget_item_id
       INNER JOIN supplier ON supplier.id = proposal.supplier_id
       INNER JOIN user AS supplier_user ON supplier_user.id = supplier.user_id
       WHERE budget_item.event_id = :eventId AND proposal.status IN ('sent', 'under_review', 'accepted')
       ORDER BY proposal.id
       FOR UPDATE OF proposal`,
      { replacements: { eventId }, transaction: this.session, type: QueryTypes.SELECT },
    )
  }

  async cancelProposals(proposalIds) {
    if (proposalIds.length === 0) return
    await sequelize.query(`UPDATE proposal SET status = 'canceled' WHERE id IN (:proposalIds)`, {
      replacements: { proposalIds },
      transaction: this.session,
    })
  }

  async acceptByProposalKey(eventId, proposalKey) {
    const proposalReferences = await sequelize.query(
      `SELECT budget_item.id AS budget_item_id, proposal.status AS initial_status
       FROM proposal
       INNER JOIN budget_item ON budget_item.id = proposal.budget_item_id
       WHERE budget_item.event_id = :eventId AND proposal.proposal_key = :proposalKey
       LIMIT 1`,
      { replacements: { eventId, proposalKey }, transaction: this.session, type: QueryTypes.SELECT },
    )
    const proposalReference = proposalReferences[0]
    const budgetItemId = proposalReference?.budget_item_id
    if (budgetItemId === undefined) return false

    const lockedItems = await sequelize.query(`SELECT id FROM budget_item WHERE id = :budgetItemId AND event_id = :eventId FOR UPDATE`, {
      replacements: { budgetItemId, eventId },
      transaction: this.session,
      type: QueryTypes.SELECT,
    })
    if (lockedItems.length === 0) return false

    const proposals = await sequelize.query(
      `SELECT proposal_key, status,
              CASE WHEN valid_until < ${TODAY_IN_BRAZIL} THEN TRUE ELSE FALSE END AS is_expired
       FROM proposal
       WHERE budget_item_id = :budgetItemId
       ORDER BY id ASC
       FOR UPDATE`,
      { replacements: { budgetItemId }, transaction: this.session, type: QueryTypes.SELECT },
    )
    const proposal = proposals.find((candidate) => candidate.proposal_key === proposalKey)
    if (!proposal) return false
    if (proposal.status !== proposalReference.initial_status) throw new ProposalDecisionConflict()
    if (Boolean(proposal.is_expired)) throw new ProposalExpired()

    await sequelize.query(
      `UPDATE proposal
       SET status = CASE WHEN proposal_key = :proposalKey THEN 'accepted' ELSE 'rejected' END,
           selected = CASE WHEN proposal_key = :proposalKey THEN TRUE ELSE FALSE END
       WHERE budget_item_id = :budgetItemId`,
      { replacements: { proposalKey, budgetItemId }, transaction: this.session },
    )

    return true
  }
}
