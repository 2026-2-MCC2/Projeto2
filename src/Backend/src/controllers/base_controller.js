// Base de todos os controllers. Todo controller faz "extends BaseController" e ganha:
//   this.context   contexto da requisição (trace id etc.)
//   this.session   sessão do banco da requisição (uma transação)
//   this.logger    logger que já inclui o trace id da requisição
//
// Para gravar no banco o que foi feito, o controller chama: await this.session.commit()
// Sem o commit, tudo o que foi alterado é desfeito no fim da requisição.

import { Logger } from '../utils/logger.js'

export class BaseController {
  constructor(context, className) {
    this.context = context
    this.session = context.dbSession
    this.logger = new Logger(context, className)
  }
}
