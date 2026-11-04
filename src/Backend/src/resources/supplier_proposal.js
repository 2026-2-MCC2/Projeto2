// Rotas do histórico de propostas do fornecedor: listar, ver, editar e retirar as próprias propostas.
// O envio fica em resources/supplier_event.js, porque nasce a partir de um item do evento.

import { USER_PROFILES } from '../constants.js'
import { SupplierProposalController } from '../controllers/supplier_proposal_controller.js'
import { getParam, getParamAsInt } from '../utils/request_params.js'
import { SchemaHandler } from '../utils/schema_handler.js'
import { SecurityTools } from '../utils/security_tools.js'

export class SupplierProposalResource {
  // GET /event_planning/supplier/proposals?status=sent&limit=20&page=0
  //   200 { "data": [ { "proposal_key": "...", "event": {...}, "item": {...}, "amount": 1500, ... } ],
  //         "total": 1, "is_last_page": true }
  async onGetList(req, res) {
    SecurityTools.requireProfile(req.context, [USER_PROFILES.SUPPLIER])

    const controller = new SupplierProposalController(req.context)
    const proposals = await controller.getProposals(req.context.user.userKey, {
      status: getParam(req, 'status'),
      limit: getParamAsInt(req, 'limit', { minValue: 1, maxValue: 100, default: 20 }),
      page: getParamAsInt(req, 'page', { minValue: 0, maxValue: 10000, default: 0 }),
    })

    res.status(200).json(proposals)
  }

  // GET /event_planning/supplier/proposals/:proposal_key
  //   200 detalhe completo · 404 { "code": "EVP000033", ... } se a proposta não for do fornecedor
  async onGetByKey(req, res, proposalKey) {
    SecurityTools.requireProfile(req.context, [USER_PROFILES.SUPPLIER])

    const controller = new SupplierProposalController(req.context)
    const proposal = await controller.getProposal(req.context.user.userKey, proposalKey)

    res.status(200).json(proposal)
  }

  // PUT /event_planning/supplier/proposals/:proposal_key (mesmo body do envio)
  //   200 detalhe atualizado
  //   409 { "code": "EVP000041" } proposta já analisada · { "code": "EVP000042" } evento fora de cotação
  async onPutByKey(req, res, proposalKey) {
    // autorização antes do schema para outros perfis sempre receberem 403
    SecurityTools.requireProfile(req.context, [USER_PROFILES.SUPPLIER])
    SchemaHandler.validate(req, 'post_supplier_proposal.json')

    const controller = new SupplierProposalController(req.context)
    const proposal = await controller.updateProposal(req.context.user.userKey, proposalKey, req.context.media)

    res.status(200).json(proposal)
  }

  // DELETE /event_planning/supplier/proposals/:proposal_key
  //   204 (sem body) · mesmos 404 e 409 da edição
  async onDeleteByKey(req, res, proposalKey) {
    SecurityTools.requireProfile(req.context, [USER_PROFILES.SUPPLIER])

    const controller = new SupplierProposalController(req.context)
    await controller.deleteProposal(req.context.user.userKey, proposalKey)

    res.status(204).end()
  }
}
