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

// só o envio de foto abre a transação depois de receber o arquivo (openSessionAfterUpload)
const PHOTO_UPLOAD_PATH = new RegExp(`^${API_PREFIX}/supplier/proposals/[^/]+/photos$`)

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

    // o cliente desistiu da requisição enquanto esperava a conexão: desfaz na hora
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

    req.context.isRequestFinished = true

    const dbSession = req.context.dbSession
    // "finished" fica preenchido depois de um commit ou rollback
    if (dbSession !== null && !dbSession.finished) {
      await dbSession.rollback()
    }
  }
}

export async function openSessionAfterUpload(req) {
  const dbSession = await DatabaseConnector.openSession()

  // o cliente desistiu durante o upload: o processResponse já rodou e não desfaria esta transação
  if (req.context.isRequestFinished) {
    await dbSession.rollback()
    throw new Error('The client disconnected before the photo upload finished')
  }

  req.context.addSession(dbSession)
}
