// Mede e identifica um trecho do processamento nos logs.
// Enquanto a operação está rodando, o id dela aparece no campo "operations" de todos os logs da
// requisição. No fim, loga quanto tempo levou.
//
// Exemplo, num controller:
//   const operation = new BasicOperation(this.context, 'send-invoice')
//   operation.start()                       // log: Operation 3f2a... send-invoice has started
//   await invoiceConnector.send(...)
//   operation.stopAndFinish()               // log: Operation 3f2a... send-invoice finished in 532 ms

import { randomUUID } from 'node:crypto'

import { Logger } from './logger.js'

export class BasicOperation {
  constructor(context, operationName = '', loggerName = 'BasicOperation') {
    this.context = context
    this.logger = new Logger(context, loggerName)
    this.operationId = randomUUID()
    this.operationName = operationName
    this.startTime = 0
    this.stopTime = 0
    this.took = 0
  }

  start() {
    this.startTime = Date.now()
    this.context.addOperation(this.operationId)
    this.logger.debug(`Operation ${this.operationId} ${this.operationName} has started`)
  }

  stop() {
    this.stopTime = Date.now()
    this.took = this.stopTime - this.startTime
  }

  finish() {
    this.logger.debug(`Operation ${this.operationId} ${this.operationName} finished in ${this.took} ms`)
    this.context.removeOperation(this.operationId)
  }

  stopAndFinish() {
    this.stop()
    this.finish()
  }
}
