import { USER_PROFILES } from '../constants.js'
import { EventController } from '../controllers/event_controller.js'
import { getParam, getParamAsInt } from '../utils/request_params.js'
import { SchemaHandler } from '../utils/schema_handler.js'
import { SecurityTools } from '../utils/security_tools.js'

/**
 * Resource HTTP para a rota de eventos (RF05, RF07, RF08).
 * Gerencia autorização por perfil, validação de schema e delegação ao controller.
 */
export class EventResource {
  async onPostList(req, res) {
    SecurityTools.requireProfile(req.context, [USER_PROFILES.ORGANIZER])
    SchemaHandler.validate(req, 'post_events.json')

    const controller = new EventController(req.context)
    const event = await controller.createEvent(req.context.user.userKey, req.context.media)

    res.status(201).json(event)
  }

  async onGetList(req, res) {
    SecurityTools.requireProfile(req.context, [USER_PROFILES.ORGANIZER])

    const limit = getParamAsInt(req, 'limit', { minValue: 1, maxValue: 100, default: 20 })
    const page = getParamAsInt(req, 'page', { minValue: 0, maxValue: 10000, default: 0 })
    const status = getParam(req, 'status')
    const search = getParam(req, 'search')

    const controller = new EventController(req.context)
    const result = await controller.getEventsList(req.context.user.userKey, {
      status,
      search,
      limit,
      page,
    })

    res.status(200).json(result)
  }

  async onGetByKey(req, res, eventKey) {
    SecurityTools.requireProfile(req.context, [USER_PROFILES.ORGANIZER])

    const controller = new EventController(req.context)
    const event = await controller.getEventByKey(req.context.user.userKey, eventKey)

    res.status(200).json(event)
  }

  async onPutByKey(req, res, eventKey) {
    SecurityTools.requireProfile(req.context, [USER_PROFILES.ORGANIZER])
    SchemaHandler.validate(req, 'put_events.json')

    const controller = new EventController(req.context)
    const event = await controller.updateEvent(req.context.user.userKey, eventKey, req.context.media)

    res.status(200).json(event)
  }

  async onPatchStatusByKey(req, res, eventKey) {
    SecurityTools.requireProfile(req.context, [USER_PROFILES.ORGANIZER])
    SchemaHandler.validate(req, 'patch_event_status.json')

    const controller = new EventController(req.context)
    const { status, reason } = req.context.media
    const event = await controller.updateEventStatus(req.context.user.userKey, eventKey, status, reason)

    res.status(200).json(event)
  }
}
