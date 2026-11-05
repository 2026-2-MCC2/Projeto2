// Middleware: cria o contexto da requisição (req.context), usado por todo o resto.
//
// O GlobalTraceId funciona como um número de protocolo: é um id único da requisição que aparece
// em todos os logs dela. Quando der problema, você busca esse id nos logs e vê tudo o que aconteceu.
// Se quem chamou mandar o header GlobalTraceId, usamos o mesmo valor, assim dá para seguir uma
// requisição que passou por vários serviços. Valor fora do formato é trocado por um novo, para
// ninguém encher o log com texto gigante ou forjar linhas de log.

import { randomUUID } from 'node:crypto'

import { Context } from '../utils/context.js'

// cobre o UUID e ids de outros serviços, sem espaço nem quebra de linha
const VALID_TRACE_ID = /^[A-Za-z0-9_-]{1,64}$/

export class ContextCreator {
  processRequest(req, res) {
    let globalTraceId = req.get('GlobalTraceId')
    if (globalTraceId === undefined || !VALID_TRACE_ID.test(globalTraceId)) {
      globalTraceId = randomUUID()
    }

    // o Cloud Run manda o header "X-Cloud-Trace-Context: TRACE_ID/SPAN_ID;o=1"; pegamos só o TRACE_ID
    let cloudTraceId = null
    const cloudTraceHeader = req.get('X-Cloud-Trace-Context')
    if (cloudTraceHeader !== undefined) {
      cloudTraceId = cloudTraceHeader.split('/')[0]
    }

    req.context = new Context(globalTraceId, cloudTraceId)

    // registrado logo no começo: se o cliente desistir antes de a sessão do banco abrir, o
    // SessionManager ainda fica sabendo e desfaz a transação em vez de deixá-la presa
    res.once('close', () => {
      req.context.isRequestFinished = true
    })
  }
}
