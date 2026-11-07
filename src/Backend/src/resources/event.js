import { USER_PROFILES } from '../constants.js'
import { EmailConnector } from '../connectors/email_connector.js'
import { WebSocketHub } from '../connectors/websocket_hub.js'
import { EventController } from '../controllers/event_controller.js'
import { getParam, getParamAsInt } from '../utils/request_params.js'
import { SchemaHandler } from '../utils/schema_handler.js'
import { SecurityTools } from '../utils/security_tools.js'

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

  async onGetProposals(req, res, eventKey) {
    SecurityTools.requireProfile(req.context, [USER_PROFILES.ORGANIZER])

    const controller = new EventController(req.context)
    const comparison = await controller.getEventProposals(req.context.user.userKey, eventKey)

    res.status(200).json(comparison)
  }

  async onPostProposalAccept(req, res, eventKey, proposalKey) {
    SecurityTools.requireProfile(req.context, [USER_PROFILES.ORGANIZER])

    const controller = new EventController(req.context)
    const { comparison, pushes } = await controller.acceptProposal(req.context.user.userKey, eventKey, proposalKey)

    res.status(200).json(comparison)
    WebSocketHub.send(pushes)
  }

  async onPostProposalReject(req, res, eventKey, proposalKey) {
    SecurityTools.requireProfile(req.context, [USER_PROFILES.ORGANIZER])

    const controller = new EventController(req.context)
    const { comparison, email, pushes } = await controller.rejectProposal(req.context.user.userKey, eventKey, proposalKey)

    res.status(200).json(comparison)
    EmailConnector.sendInBackground(email)
    WebSocketHub.send(pushes)
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
    const { event, emails, pushes } = await controller.updateEventStatus(req.context.user.userKey, eventKey, status, reason)

    res.status(200).json(event)
    emails.forEach((email) => EmailConnector.sendInBackground(email))
    WebSocketHub.send(pushes)
  }

  async onPostInternalCosts(req, res, eventKey) {
    SecurityTools.requireProfile(req.context, [USER_PROFILES.ORGANIZER])
    SchemaHandler.validate(req, 'internal_cost.json')

    const controller = new EventController(req.context)
    const event = await controller.addInternalCost(req.context.user.userKey, eventKey, req.context.media)

    res.status(201).json(event)
  }

  async onPutInternalCostByKey(req, res, eventKey, costKey) {
    SecurityTools.requireProfile(req.context, [USER_PROFILES.ORGANIZER])
    SchemaHandler.validate(req, 'internal_cost.json')

    const controller = new EventController(req.context)
    const event = await controller.updateInternalCost(req.context.user.userKey, eventKey, costKey, req.context.media)

    res.status(200).json(event)
  }

  async onDeleteInternalCostByKey(req, res, eventKey, costKey) {
    SecurityTools.requireProfile(req.context, [USER_PROFILES.ORGANIZER])

    const controller = new EventController(req.context)
    const event = await controller.removeInternalCost(req.context.user.userKey, eventKey, costKey)

    res.status(200).json(event)
  }
}
