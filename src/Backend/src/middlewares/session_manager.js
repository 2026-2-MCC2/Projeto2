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
import { BYPASS_ENDPOINTS } from '../constants.js'

export class SessionManager {
  async processRequest(req, res) {
    if (req.method === 'OPTIONS' || BYPASS_ENDPOINTS.includes(req.path)) {
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
