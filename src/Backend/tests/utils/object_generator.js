import { DbUtils } from './db_utils.js'

export class ObjectGenerator {
  static async createUserFixture(options) {
    return DbUtils.createUserFixture(options)
  }
}
