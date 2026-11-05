// Middleware: abre a sessão do banco no começo da requisição e fecha no fim.
//
// TRANSAÇÃO, COMMIT E ROLLBACK
// A sessão é uma transação: um pacote de alterações no banco que vale "tudo ou nada". Exemplo:
// criar a entidade e gravar o histórico de status. Se der erro no meio, não pode ficar só metade.
//   commit    confirma: grava de vez tudo o que foi feito na transação
//   rollback  cancela: desfaz tudo o que foi feito desde que a transação começou
//
// Como funciona aqui:
//   processRequest:  abre a transação e guarda em req.context.dbSession
//   no meio:         o controller usa this.session e chama await this.session.commit() para gravar
//   processResponse: se ninguém fez commit, faz rollback. Também devolve a conexão para o pool.
// Ou seja: se der erro no meio da requisição e o controller não chegar no commit, nada é gravado.

import { DatabaseConnector } from '../connectors/database_connector.js'
import { API_PREFIX, BYPASS_ENDPOINTS } from '../constants.js'
import { Context } from '../utils/context.js'
import { Logger } from '../utils/logger.js'

// Rotas que abrem a própria transação, fora do SessionManager:
//   envio de foto   abre depois de receber o arquivo (openSessionAfterUpload)
//   esqueci-senha   faz o trabalho depois de responder (runAfterResponse)
// Igual ao roteamento do Express: sem diferença de maiúscula e com barra no fim opcional
const PHOTO_UPLOAD_PATH = new RegExp(`^${API_PREFIX}/supplier/proposals/[^/]+/photos/?$`, 'i')
const FORGOT_PASSWORD_PATH = new RegExp(`^${API_PREFIX}/auth/esqueci-senha/?$`, 'i')

const isPhotoUpload = (req) => req.method === 'POST' && PHOTO_UPLOAD_PATH.test(req.path)
const isForgotPassword = (req) => req.method === 'POST' && FORGOT_PASSWORD_PATH.test(req.path)

export class SessionManager {
  async processRequest(req, res) {
    if (req.method === 'OPTIONS' || BYPASS_ENDPOINTS.includes(req.path)) {
      return
    }
    // um upload lento não pode segurar uma conexão do banco
    if (isPhotoUpload(req) || isForgotPassword(req)) {
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

// Trabalho que segue depois de a resposta ser enviada, numa transação própria: a da requisição é
// desfeita quando a resposta fecha. Falhas viram log, porque não há mais a quem responder.
export function runAfterResponse(requestContext, work) {
  const context = new Context(requestContext.globalTraceId, requestContext.cloudTraceId)
  const logger = new Logger(context, 'SessionManager')

  async function runInOwnSession() {
    const dbSession = await DatabaseConnector.openSession()
    context.addSession(dbSession)
    try {
      await work(context)
    } finally {
      if (!dbSession.finished) await dbSession.rollback()
    }
  }

  runInOwnSession().catch((error) => logger.error(`Work after response failed: ${error.stack ?? error}`))
}
