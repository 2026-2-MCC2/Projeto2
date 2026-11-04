// Rotas HTTP para criar itens de custo vinculados aos eventos do Organizador.

import { USER_PROFILES } from '../constants.js'
import { BudgetItemController } from '../controllers/budget_item_controller.js'
import { SchemaHandler } from '../utils/schema_handler.js'
import { SecurityTools } from '../utils/security_tools.js'

export class BudgetItemResource {
  async onGetItems(req, res, eventKey) {
    SecurityTools.requireProfile(req.context, [USER_PROFILES.ORGANIZER])

    const controller = new BudgetItemController(req.context)
    const items = await controller.getItems(req.context.user.userKey, eventKey)

    res.status(200).json(items)
  }

  async onPostItems(req, res, eventKey) {
    SecurityTools.requireProfile(req.context, [USER_PROFILES.ORGANIZER])
    SchemaHandler.validate(req, 'post_budget_item.json')

    const controller = new BudgetItemController(req.context)
    const item = await controller.createItem(req.context.user.userKey, eventKey, req.context.media)

    res.status(201).json(item)
  }

  async onPutItemsByKey(req, res, eventKey, itemKey) {
    SecurityTools.requireProfile(req.context, [USER_PROFILES.ORGANIZER])
    SchemaHandler.validate(req, 'put_budget_item.json')

    const controller = new BudgetItemController(req.context)
    const item = await controller.updateItem(req.context.user.userKey, eventKey, itemKey, req.context.media)

    res.status(200).json(item)
  }

  async onDeleteItemsByKey(req, res, eventKey, itemKey) {
    SecurityTools.requireProfile(req.context, [USER_PROFILES.ORGANIZER])

    const controller = new BudgetItemController(req.context)
    await controller.deleteItem(req.context.user.userKey, eventKey, itemKey)

    res.status(204).end()
  }
}
