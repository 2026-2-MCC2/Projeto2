// Rotas do histórico de propostas do fornecedor: listar, ver, editar e retirar as próprias propostas,
// e enviar ou apagar as fotos delas. O envio da proposta fica em resources/supplier_event.js, porque
// nasce a partir de um item do evento.

import multer from 'multer'

import { USER_PROFILES } from '../constants.js'
import { SupplierProposalController } from '../controllers/supplier_proposal_controller.js'
import { InvalidProposalPhoto, ProposalPhotoTooLarge } from '../errors/index.js'
import { MAX_PHOTO_BYTES, MAX_PHOTO_MEGABYTES } from '../utils/proposal_photo_tools.js'
import { getParam, getParamAsInt } from '../utils/request_params.js'
import { SchemaHandler } from '../utils/schema_handler.js'
import { openSessionAfterUpload } from '../middlewares/session_manager.js'
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
      after: getParam(req, 'after'),
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

  // POST /event_planning/supplier/proposals/:proposal_key/photos (multipart/form-data, campo "photo")
  //   201 { "photo_key": "6f1c...", "url": "<URL de leitura com validade curta>" }
  //   400 { "code": "EVP000044" } não é JPG/PNG/WebP de verdade, faltou o campo "photo" ou o formulário veio quebrado
  //   413 { "code": "EVP000045" } foto acima de 5 MB
  //   409 { "code": "EVP000043" } a proposta já tem 5 fotos · EVP000041/42 como na edição
  async onPostPhotos(req, res, proposalKey) {
    SecurityTools.requireProfile(req.context, [USER_PROFILES.SUPPLIER])
    const file = await receivePhoto(req, res)
    await openSessionAfterUpload(req)

    const controller = new SupplierProposalController(req.context)
    const photo = await controller.addPhoto(req.context.user.userKey, proposalKey, file)

    res.status(201).json(photo)
  }

  // DELETE /event_planning/supplier/proposals/:proposal_key/photos/:photo_key
  //   204 · 404 { "code": "EVP000046" } foto que não é da proposta · mesmos 409 da edição
  async onDeletePhotosByKey(req, res, proposalKey, photoKey) {
    SecurityTools.requireProfile(req.context, [USER_PROFILES.SUPPLIER])

    const controller = new SupplierProposalController(req.context)
    await controller.deletePhoto(req.context.user.userKey, proposalKey, photoKey)

    res.status(204).end()
  }
}

// Lê a foto do formulário só em memória (nada vai para o disco), com no máximo 5 MB e um arquivo.
// O tipo real é conferido depois, pelos bytes (utils/proposal_photo_tools.js).
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
