import { BYPASS_ENDPOINTS } from '../constants.js'
import { InvalidSchema, PayloadTooLarge } from '../errors/index.js'
import { Logger } from '../utils/logger.js'
import { hideSensitiveData } from '../utils/sensitive_data.js'

// o maior body JSON da API (evento com itens) fica bem abaixo disso; a foto vai por multipart, com limite próprio
const MAX_BODY_BYTES = 1024 * 1024

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
      toLogJson.media = hideSensitiveData(req.context.media)
    }
    if (Object.keys(req.query).length > 0) {
      toLogJson.params = hideSensitiveData(req.query)
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
      hideSensitiveData(req.context.responseMedia),
    )
  }

  async deserializeRequest(req) {
    // upload de arquivo: o corpo fica para o multer ler no resource, já com o limite de tamanho
    // (ler aqui guardaria o arquivo inteiro na memória e deixaria o multer sem nada para ler)
    if (req.is('multipart/form-data')) {
      req.context.binaryBody = null
      req.context.media = null
      return
    }

    const binaryBody = await readBodyWithLimit(req, MAX_BODY_BYTES)
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

  // o express não guarda o body enviado; a cópia permite logar a resposta no processResponse
  saveResponseMedia(req, res) {
    const originalJson = res.json.bind(res)

    res.json = (body) => {
      req.context.responseMedia = body
      return originalJson(body)
    }
  }
}

// para de ler assim que passa do limite, sem guardar o resto na memória. destroyOnReturn: false
// mantém a conexão aberta, senão o 413 não chegaria ao cliente (o Node descarta o resto do body sozinho)
async function readBodyWithLimit(req, maxBytes) {
  if (Number(req.get('content-length')) > maxBytes) {
    throw new PayloadTooLarge(maxBytes / 1024)
  }

  const chunks = []
  let totalBytes = 0
  for await (const chunk of req.iterator({ destroyOnReturn: false })) {
    totalBytes += chunk.length
    if (totalBytes > maxBytes) {
      throw new PayloadTooLarge(maxBytes / 1024)
    }
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}
