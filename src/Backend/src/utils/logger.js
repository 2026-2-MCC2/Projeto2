import { threadId } from 'node:worker_threads'

import { GCP_PROJECT_ID, IS_LOCAL, SERVICE_NAME } from '../constants.js'

export class Logger {
  // context é null fora de uma requisição (ex.: subida da aplicação)
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
      // campo do cloud logging que agrupa os logs da mesma requisição
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
