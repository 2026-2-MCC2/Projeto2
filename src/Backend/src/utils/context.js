// Contexto da requisição: tudo que acompanha uma requisição do começo ao fim.
// É criado pelo middleware ContextCreator e fica em req.context.
//
// O que tem nele:
//   globalTraceId   id para achar todos os logs de uma mesma requisição
//   cloudTraceId    id de trace que o Cloud Run envia, usado para agrupar os logs no Cloud Logging
//   operations      operações em andamento (ver utils/operations.js), aparecem nos logs
//   dbSession       sessão do banco (transação) aberta pelo SessionManager
//   user            usuário logado { userKey, profile }, preenchido pelo UserAuthenticationMiddleware
//                   (fica null nas rotas públicas, como login e health check)
//   media           body da requisição convertido de JSON (null se não veio body)
//   binaryBody      body da requisição do jeito que chegou (bytes); útil para validar assinatura de webhook
//   responseMedia   body da resposta, guardado para o log de saída

export class Context {
  constructor(globalTraceId, cloudTraceId) {
    this.globalTraceId = globalTraceId
    this.cloudTraceId = cloudTraceId
    this.operations = []
    this.dbSession = null
    this.user = null
    this.requestStartTime = null

    this.media = null
    this.binaryBody = null
    this.responseMedia = undefined
    this.isRequestFinished = false
  }

  addSession(dbSession) {
    this.dbSession = dbSession
  }

  addOperation(operationId) {
    this.operations.push({ id: operationId })
  }

  // remove a operação e as que foram abertas depois dela
  removeOperation(operationId) {
    const index = this.operations.findIndex((operation) => operation.id === operationId)
    if (index >= 0) {
      this.operations = this.operations.slice(0, index)
    }
  }

  clearOperations() {
    this.operations = []
  }
}
