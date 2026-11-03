// Rotas HTTP para criar itens de custo vinculados aos eventos do Organizador.

import { USER_PROFILES } from '../constants.js'
import { BudgetItemController } from '../controllers/budget_item_controller.js'
import { SchemaHandler } from '../utils/schema_handler.js'
import { SecurityTools } from '../utils/security_tools.js'

export class BudgetItemResource {
  async onPostItems(req, res, eventKey) {
    SecurityTools.requireProfile(req.context, [USER_PROFILES.ORGANIZER])
    SchemaHandler.validate(req, 'post_budget_item.json')

    const controller = new BudgetItemController(req.context)
    const item = await controller.createItem(req.context.user.userKey, eventKey, req.context.media)

    res.status(201).json(item)
  }
}
