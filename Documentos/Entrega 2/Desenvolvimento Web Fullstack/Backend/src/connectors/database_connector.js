import { Sequelize } from 'sequelize'
import { DB_CREDENTIALS_SECRET_NAME, DB_NAME, DB_POOL_SIZE, IS_PRODUCTION } from '../constants.js'
import { Logger } from '../utils/logger.js'
import { SecretManagerConnector } from './secret_manager_connector.js'

const logger = new Logger(null, 'DatabaseConnector')

class CredentialsCache {
  static credentials = null
}

export const sequelize = new Sequelize({
  dialect: 'mysql',
  database: DB_NAME,
  logging: false,
  pool: { max: DB_POOL_SIZE, idle: 60_000 },
  hooks: {
    beforeConnect: async (config) => {
      if (CredentialsCache.credentials === null) {
        const secretValue = await SecretManagerConnector.getSecretByName(DB_CREDENTIALS_SECRET_NAME)
        CredentialsCache.credentials = JSON.parse(secretValue)
      }

      const credentials = CredentialsCache.credentials
      config.username = credentials.username
      config.password = credentials.password

      config.host = credentials.host
      config.port = credentials.port

      // em produção o banco fica na internet (Aiven): sem o certificado, senha e dados iriam sem TLS
      if (!credentials.ssl_ca && IS_PRODUCTION) {
        const message = 'Database secret has no ssl_ca: refusing to connect without TLS in production'
        logger.fatal(message)
        throw new Error(message)
      }

      if (credentials.ssl_ca) {
        config.dialectOptions = {
          ...config.dialectOptions,
          ssl: { ca: credentials.ssl_ca, rejectUnauthorized: true },
        }
      }
    },
  },
})

export class DatabaseConnector {
  static async openSession() {
    try {
      return await sequelize.transaction()
    } catch (error) {
      if (!isInvalidCredentials(error)) {
        throw error
      }

      // a senha pode ter sido trocada no Secret Manager: esquecer a guardada faz o beforeConnect buscar de novo
      logger.warning('Database refused the credentials, fetching them again from Secret Manager')
      CredentialsCache.credentials = null
      return sequelize.transaction()
    }
  }

  static async isAvailable() {
    try {
      await sequelize.query('SELECT 1')
      return true
    } catch (error) {
      logger.error(`Database is not available: ${error.message}`)
      return false
    }
  }

  static async close() {
    await sequelize.close()
  }
}

function isInvalidCredentials(error) {
  const mysqlErrorCode = error.parent?.code
  return mysqlErrorCode === 'ER_ACCESS_DENIED_ERROR'
}
