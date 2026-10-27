// Middleware: cria o contexto da requisição (req.context), usado por todo o resto.
//
// O GlobalTraceId funciona como um número de protocolo: é um id único da requisição que aparece
// em todos os logs dela. Quando der problema, você busca esse id nos logs e vê tudo o que aconteceu.
// Se quem chamou mandar o header GlobalTraceId, usamos o mesmo valor, assim dá para seguir uma
// requisição que passou por vários serviços.

import { randomUUID } from 'node:crypto'

import { Context } from '../utils/context.js'

export class ContextCreator {
  processRequest(req, res) {
    let globalTraceId = req.get('GlobalTraceId')
    if (globalTraceId === undefined) {
      globalTraceId = randomUUID()
    }

    // o Cloud Run manda o header "X-Cloud-Trace-Context: TRACE_ID/SPAN_ID;o=1"; pegamos só o TRACE_ID
    let cloudTraceId = null
    const cloudTraceHeader = req.get('X-Cloud-Trace-Context')
    if (cloudTraceHeader !== undefined) {
      cloudTraceId = cloudTraceHeader.split('/')[0]
    }

    req.context = new Context(globalTraceId, cloudTraceId)
  }
}
