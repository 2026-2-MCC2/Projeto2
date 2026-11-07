import multer from 'multer'

import { USER_PROFILES } from '../constants.js'
import { WebSocketHub } from '../connectors/websocket_hub.js'
import { SupplierProposalController } from '../controllers/supplier_proposal_controller.js'
import { InvalidProposalPhoto, ProposalPhotoTooLarge } from '../errors/index.js'
import { MAX_PHOTO_BYTES, MAX_PHOTO_MEGABYTES } from '../utils/proposal_photo_tools.js'
import { getParam, getParamAsInt } from '../utils/request_params.js'
import { SchemaHandler } from '../utils/schema_handler.js'
import { openSessionAfterUpload } from '../middlewares/session_manager.js'
import { SecurityTools } from '../utils/security_tools.js'

export class SupplierProposalResource {
  async onGetList(req, res) {
    SecurityTools.requireProfile(req.context, [USER_PROFILES.SUPPLIER])

    const controller = new SupplierProposalController(req.context)
    const proposals = await controller.getProposals(req.context.user.userKey, {
      status: getParam(req, 'status'),
      limit: getParamAsInt(req, 'limit', { minValue: 1, maxValue: 100, default: 20 }),
      page: getParamAsInt(req, 'page', { minValue: 0, maxValue: 10000, default: 0 }),
      after: getParam(req, 'after'),
    })

    res.status(200).json(proposals)
  }

  async onGetByKey(req, res, proposalKey) {
    SecurityTools.requireProfile(req.context, [USER_PROFILES.SUPPLIER])

    const controller = new SupplierProposalController(req.context)
    const proposal = await controller.getProposal(req.context.user.userKey, proposalKey)

    res.status(200).json(proposal)
  }

  async onPutByKey(req, res, proposalKey) {
    // autorização antes do schema para outros perfis sempre receberem 403
    SecurityTools.requireProfile(req.context, [USER_PROFILES.SUPPLIER])
    SchemaHandler.validate(req, 'post_supplier_proposal.json')

    const controller = new SupplierProposalController(req.context)
    const { proposal, pushes } = await controller.updateProposal(req.context.user.userKey, proposalKey, req.context.media)

    res.status(200).json(proposal)
    WebSocketHub.send(pushes)
  }

  async onDeleteByKey(req, res, proposalKey) {
    SecurityTools.requireProfile(req.context, [USER_PROFILES.SUPPLIER])

    const controller = new SupplierProposalController(req.context)
    const pushes = await controller.deleteProposal(req.context.user.userKey, proposalKey)

    res.status(204).end()
    WebSocketHub.send(pushes)
  }

  async onPostPhotos(req, res, proposalKey) {
    SecurityTools.requireProfile(req.context, [USER_PROFILES.SUPPLIER])
    const file = await receivePhoto(req, res)
    await openSessionAfterUpload(req)

    const controller = new SupplierProposalController(req.context)
    const photo = await controller.addPhoto(req.context.user.userKey, proposalKey, file)

    res.status(201).json(photo)
  }

  async onDeletePhotosByKey(req, res, proposalKey, photoKey) {
    SecurityTools.requireProfile(req.context, [USER_PROFILES.SUPPLIER])

    const controller = new SupplierProposalController(req.context)
    await controller.deletePhoto(req.context.user.userKey, proposalKey, photoKey)

    res.status(204).end()
  }
}

const uploadPhoto = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PHOTO_BYTES, files: 1, fields: 0 },
}).single('photo')

function receivePhoto(req, res) {
  return new Promise((resolve, reject) => {
    uploadPhoto(req, res, (error) => {
      if (error?.code === 'LIMIT_FILE_SIZE') {
        reject(new ProposalPhotoTooLarge(MAX_PHOTO_MEGABYTES))
      } else if (error instanceof multer.MulterError) {
        reject(new InvalidProposalPhoto(`Send only one file, in the "photo" field (${error.code}).`))
      } else if (error) {
        // erros do leitor do formulário (ex.: "Unexpected end of form") vêm de um envio mal montado ou interrompido
        reject(new InvalidProposalPhoto(`Malformed multipart form (${error.message}).`))
      } else if (!req.file) {
        reject(new InvalidProposalPhoto('Send the photo as multipart/form-data, in the "photo" field.'))
      } else {
        resolve(req.file)
      }
    })
  })
}
