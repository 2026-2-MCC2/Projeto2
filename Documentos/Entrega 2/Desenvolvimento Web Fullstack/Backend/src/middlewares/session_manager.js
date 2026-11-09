import { DatabaseConnector } from '../connectors/database_connector.js'
import { API_PREFIX, BYPASS_ENDPOINTS } from '../constants.js'

// igual ao roteamento do Express: sem diferença de maiúscula e com barra no fim opcional
const PHOTO_UPLOAD_PATH = new RegExp(`^${API_PREFIX}/supplier/proposals/[^/]+/photos/?$`, 'i')

const isPhotoUpload = (req) => req.method === 'POST' && PHOTO_UPLOAD_PATH.test(req.path)

export class SessionManager {
  async processRequest(req, res) {
    if (req.method === 'OPTIONS' || BYPASS_ENDPOINTS.includes(req.path)) {
      return
    }
    // um upload lento não pode segurar uma conexão do banco
    if (isPhotoUpload(req)) {
      return
    }

    const dbSession = await DatabaseConnector.openSession()

    // a requisição terminou (ou o cliente desistiu) antes de a conexão chegar: desfaz na hora
    if (req.context.isRequestFinished) {
      await dbSession.rollback()
      return
    }

    req.context.addSession(dbSession)
  }

  async processResponse(req, res) {
    if (req.method === 'OPTIONS' || BYPASS_ENDPOINTS.includes(req.path)) {
      return
    }

    const dbSession = req.context.dbSession
    // "finished" fica preenchido depois de um commit ou rollback
    if (dbSession !== null && !dbSession.finished) {
      await dbSession.rollback()
    }
  }
}

export async function openSessionAfterUpload(req) {
  // se o SessionManager já abriu a transação, ela segue valendo: abrir outra deixaria a primeira presa
  if (req.context.dbSession !== null) return

  const dbSession = await DatabaseConnector.openSession()

  // o cliente desistiu durante o upload: o processResponse já rodou e não desfaria esta transação
  if (req.context.isRequestFinished) {
    await dbSession.rollback()
    throw new Error('The client disconnected before the photo upload finished')
  }

  req.context.addSession(dbSession)
}
