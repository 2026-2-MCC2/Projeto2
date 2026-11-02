import { Logger } from '../utils/logger.js'
import { ApiException, InternalError } from './base_error.js'

export class APIErrorHandler {
  static handle(error, req, res, next) {
    // a resposta já começou a ser enviada; o express encerra a conexão
    if (res.headersSent) {
      return next(error)
    }

    if (error instanceof ApiException) {
      return APIErrorHandler.apiException(error, res)
    }
    return APIErrorHandler.unexpected(error, req, res)
  }

  static apiException(error, res) {
    res.status(error.httpStatus).json(error)
  }

  // erro inesperado: stack só no log, e o cliente recebe um 500 sem detalhes internos
  static unexpected(error, req, res) {
    const logger = new Logger(req.context, 'APIErrorHandler')
    logger.fatal(error.stack ?? String(error))

    const internalError = new InternalError()
    res.status(internalError.httpStatus).json(internalError)
  }
}
