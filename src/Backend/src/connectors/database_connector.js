// Conexão com o MySQL (local: container "db" do docker-compose; produção: Aiven for MySQL)
import { Sequelize } from 'sequelize'
import { DB_CREDENTIALS_SECRET_NAME, DB_NAME, DB_POOL_SIZE } from '../constants.js'
import { Logger } from '../utils/logger.js'
import { SecretManagerConnector } from './secret_manager_connector.js'

const logger = new Logger(null, 'DatabaseConnector')

// credenciais lidas do Secret Manager, guardadas em memória para não buscar a cada conexão
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
  // Abre uma sessão (uma transação no banco) para a requisição. Ver middlewares/session_manager.js.
  static async openSession() {
    try {
      return await sequelize.transaction()
    } catch (error) {
      if (!isInvalidCredentials(error)) {
        throw error
      }

      // A senha pode ter sido trocada no Secret Manager: esquece a guardada e tenta de novo,
      // o que faz o beforeConnect buscar o secret outra vez.
      logger.warning('Database refused the credentials, fetching them again from Secret Manager')
      CredentialsCache.credentials = null
      return sequelize.transaction()
    }
  }

  // Confere se o banco está respondendo, com a consulta mais simples possível (SELECT 1).
  // Usado pelo health check. Devolve true ou false, nunca lança erro.
  static async isAvailable() {
    try {
      await sequelize.query('SELECT 1')
      return true
    } catch (error) {
      logger.error(`Database is not available: ${error.message}`)
      return false
    }
  }

  // Fecha todas as conexões. Chamado no desligamento da aplicação (server.js).
  static async close() {
    await sequelize.close()
  }
}

// ER_ACCESS_DENIED_ERROR é o código do MySQL para usuário ou senha inválidos
function isInvalidCredentials(error) {
  const mysqlErrorCode = error.parent?.code
  return mysqlErrorCode === 'ER_ACCESS_DENIED_ERROR'
}
