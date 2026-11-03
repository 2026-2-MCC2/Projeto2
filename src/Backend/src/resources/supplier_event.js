// Rotas para fornecedores consultarem eventos e itens disponíveis para cotação.

import { USER_PROFILES } from '../constants.js'
import { SupplierEventController } from '../controllers/supplier_event_controller.js'
import { getParam, getParamAsInt } from '../utils/request_params.js'
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
}
