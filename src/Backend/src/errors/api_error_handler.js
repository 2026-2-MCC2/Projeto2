// Transforma qualquer erro lançado durante a requisição na resposta padrão da API.
// Fica registrado por último no app.js. No Express, uma função com 4 parâmetros
// (error, req, res, next) é um tratador de erros.

import { Logger } from '../utils/logger.js'
import { ApiException, InternalError } from './base_error.js'

export class APIErrorHandler {
  static handle(error, req, res, next) {
    // a resposta já começou a ser enviada; deixa o Express encerrar a conexão
    if (res.headersSent) {
      return next(error)
    }

    if (error instanceof ApiException) {
      return APIErrorHandler.apiException(error, res)
    }
    return APIErrorHandler.unexpected(error, req, res)
  }

  // erros da API (throw new NotFoundSampleEntity(...) etc.): responde com o status do erro
  static apiException(error, res) {
    res.status(error.httpStatus).json(error)
  }

  // Qualquer outro erro é bug: o stack trace (onde o erro aconteceu) vai para o log como CRITICAL,
  // e quem chamou recebe só um 500 genérico, sem detalhes internos.
  static unexpected(error, req, res) {
    const logger = new Logger(req.context, 'APIErrorHandler')
    logger.fatal(error.stack ?? String(error))

    const internalError = new InternalError()
    res.status(internalError.httpStatus).json(internalError)
  }
}
