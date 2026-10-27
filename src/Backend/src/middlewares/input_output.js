// Middleware: lê o body da requisição e loga a entrada e a saída de cada requisição.
//
// Exemplo dos logs gerados (ambiente local):
//   INCOMING REQUEST POST /event_planning/sample_entity ::1 - {"media":{"hello":"world"}}
//   OUTGOING RESPONSE 201 POST /event_planning/sample_entity ::1 12 ms - {"sample_entity_key":"6f1c..."}
//
// Se o body tiver o campo "document_b64" (arquivo em base64), ele aparece como "BASE64 HIDDEN" no log.

import { buffer } from 'node:stream/consumers'

import { BYPASS_ENDPOINTS } from '../constants.js'
import { InvalidSchema } from '../errors/index.js'
import { Logger } from '../utils/logger.js'

export class InputOutputMiddleware {
  async processRequest(req, res) {
    if (req.method === 'OPTIONS' || BYPASS_ENDPOINTS.includes(req.path)) {
      return
    }

    const logger = new Logger(req.context, 'InputOutputMiddleware')
    req.context.requestStartTime = Date.now()

    this.saveResponseMedia(req, res)
    await this.deserializeRequest(req)

    const toLogJson = {}
    if (req.context.media !== null) {
      toLogJson.media = hideBase64(req.context.media)
    }
    if (Object.keys(req.query).length > 0) {
      toLogJson.params = req.query
    }

    logger.info(`INCOMING REQUEST ${req.method} ${req.path} ${req.ip}`, toLogJson)
  }

  processResponse(req, res) {
    if (req.method === 'OPTIONS' || BYPASS_ENDPOINTS.includes(req.path)) {
      return
    }

    const logger = new Logger(req.context, 'InputOutputMiddleware')
    const totalRequestTime = Date.now() - req.context.requestStartTime

    logger.info(
      `OUTGOING RESPONSE ${res.statusCode} ${req.method} ${req.path} ${req.ip} ${totalRequestTime} ms`,
      hideBase64(req.context.responseMedia),
    )
  }

  // Lê o body inteiro da requisição. Guarda os bytes como chegaram em req.context.binaryBody e,
  // se for JSON, o objeto convertido em req.context.media. JSON mal formado responde 400.
  async deserializeRequest(req) {
    const binaryBody = await buffer(req)
    req.context.binaryBody = binaryBody

    const contentType = req.get('content-type')
    const isJson = contentType === undefined || contentType.includes('json')

    let media = null
    if (binaryBody.length > 0 && isJson) {
      try {
        media = JSON.parse(binaryBody.toString('utf8'))
      } catch {
        throw new InvalidSchema('Malformed JSON File')
      }
    }

    req.context.media = media
  }

  // O Express não guarda o body que foi enviado na resposta. Trocamos o res.json por uma versão que
  // guarda uma cópia em req.context.responseMedia antes de enviar, para o processResponse poder logar.
  saveResponseMedia(req, res) {
    const originalJson = res.json.bind(res)

    res.json = (body) => {
      req.context.responseMedia = body
      return originalJson(body)
    }
  }
}

function hideBase64(media) {
  if (media && media.document_b64) {
    return { ...media, document_b64: 'BASE64 HIDDEN' }
  }
  return media
}
