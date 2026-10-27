// Logger: escreve as mensagens de log da aplicação (o "diário" do que aconteceu em cada requisição).
//
// Uso (controllers já têm this.logger pronto):
//   this.logger.debug('Fetching Entity with key 123')        detalhe para investigar problemas
//   this.logger.info('Payment approved', { amount: 10 })    acontecimento normal (o 2º parâmetro é opcional)
//   this.logger.warning('Retrying request')                   algo estranho, mas a aplicação seguiu
//   this.logger.error('Could not send e-mail')                algo falhou
//   this.logger.fatal(error.stack)                            falha grave (vira CRITICAL)
//
// Fora de um controller: const logger = new Logger(req.context, 'NomeDaClasse')
//
// Como aparece:
//   local (texto):  1234 - 0 [trocaticket-event-planning-api.SampleEntityController][INFO] - Payment approved - {"amount":10}
//   Cloud Run (JSON, uma linha por log):
//     {"severity":"INFO","message":"Payment approved","global_trace_id":"6f1c...","message_json":{"amount":10},...}
// No Cloud Run, tudo que é escrito no terminal vai para o Cloud Logging. Em JSON, o campo "severity"
// vira o nível do log, e dá para filtrar todos os logs de uma requisição pelo global_trace_id.

import { threadId } from 'node:worker_threads'

import { GCP_PROJECT_ID, IS_LOCAL, SERVICE_NAME } from '../constants.js'

export class Logger {
  // context pode ser null quando o log não é de uma requisição (ex.: subida da aplicação)
  constructor(context, className) {
    this.context = context
    this.loggerName = `${SERVICE_NAME}.${className}`
  }

  debug(msg, messageJson) {
    this.write('DEBUG', msg, messageJson)
  }

  info(msg, messageJson) {
    this.write('INFO', msg, messageJson)
  }

  warning(msg, messageJson) {
    this.write('WARNING', msg, messageJson)
  }

  error(msg, messageJson) {
    this.write('ERROR', msg, messageJson)
  }

  fatal(msg, messageJson) {
    this.write('CRITICAL', msg, messageJson)
  }

  write(severity, msg, messageJson) {
    let line
    if (IS_LOCAL) {
      line = this.formatAsText(severity, msg, messageJson)
    } else {
      line = this.formatAsJson(severity, msg, messageJson)
    }
    console.log(line)
  }

  formatAsText(severity, msg, messageJson) {
    let message = msg
    if (messageJson !== undefined) {
      message = `${msg} - ${JSON.stringify(messageJson)}`
    }
    return `${process.pid} - ${threadId} [${this.loggerName}][${severity}] - ${message}`
  }

  formatAsJson(severity, msg, messageJson) {
    const logJson = {
      severity: severity,
      message: msg,
      loggerName: this.loggerName,
      pid: process.pid,
      tid: threadId,
      timestamp: new Date().toISOString(),
    }

    if (this.context) {
      logJson.global_trace_id = this.context.globalTraceId
      logJson.operations = this.context.operations
      // campo especial do Cloud Logging: agrupa os logs da mesma requisição
      if (this.context.cloudTraceId) {
        logJson['logging.googleapis.com/trace'] = `projects/${GCP_PROJECT_ID}/traces/${this.context.cloudTraceId}`
      }
    }

    if (messageJson !== undefined) {
      logJson.message_json = messageJson
    }

    return JSON.stringify(logJson)
  }
}
