import { Logger } from '../utils/logger.js'

export class BaseController {
  constructor(context, className) {
    this.session = context.dbSession
    this.logger = new Logger(context, className)
  }
}
