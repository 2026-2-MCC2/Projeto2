// Rotas para fornecedores consultarem eventos e itens disponíveis para cotação e enviarem propostas.

import { USER_PROFILES } from '../constants.js'
import { SupplierEventController } from '../controllers/supplier_event_controller.js'
import { SupplierProposalController } from '../controllers/supplier_proposal_controller.js'
import { getParam, getParamAsInt } from '../utils/request_params.js'
import { SchemaHandler } from '../utils/schema_handler.js'
import { SecurityTools } from '../utils/security_tools.js'

export class SupplierEventResource {
  async onGetList(req, res) {
    SecurityTools.requireProfile(req.context, [USER_PROFILES.SUPPLIER])

    const controller = new SupplierEventController(req.context)
    const events = await controller.getAvailableEvents(req.context.user.userKey, {
      search: getParam(req, 'search'),
      limit: getParamAsInt(req, 'limit', { minValue: 1, maxValue: 100, default: 20 }),
      page: getParamAsInt(req, 'page', { minValue: 0, maxValue: 10000, default: 0 }),
    })

    res.status(200).json(events)
  }

  async onGetByKey(req, res, eventKey) {
    SecurityTools.requireProfile(req.context, [USER_PROFILES.SUPPLIER])

    const controller = new SupplierEventController(req.context)
    const event = await controller.getAvailableEvent(req.context.user.userKey, eventKey)

    res.status(200).json(event)
  }

  // POST /event_planning/supplier/events/:event_key/items/:item_key/proposals
  //   201 { "proposal_key": "6f1c2a9e-...", "status": "sent" }
  //   404 evento fora de cotação ou item que não é do evento ou de uma categoria do fornecedor
  //   409 { "code": "EVP000038", ... } se o fornecedor já enviou proposta para o item
  //   400 { "code": "EVP000039" | "EVP000040", ... } validade antes de hoje ou depois do fim do evento
  async onPostItemProposals(req, res, eventKey, itemKey) {
    // autorização antes do schema para outros perfis sempre receberem 403
    SecurityTools.requireProfile(req.context, [USER_PROFILES.SUPPLIER])
    SchemaHandler.validate(req, 'post_supplier_proposal.json')

    const controller = new SupplierProposalController(req.context)
    const proposal = await controller.createProposal(req.context.user.userKey, eventKey, itemKey, req.context.media)

    res.status(201).json(proposal)
  }
}
