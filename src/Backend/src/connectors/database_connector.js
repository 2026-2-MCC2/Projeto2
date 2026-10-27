// Conexão com o MySQL (local: container "db" do docker-compose; produção: Cloud SQL).
//
// ORM
// Usamos o Sequelize (https://sequelize.org), um ORM: uma biblioteca que deixa trabalhar com o
// banco usando classes e objetos JavaScript em vez de escrever SQL. Cada tabela vira uma classe
// (ver models/) e cada linha vira um objeto dessa classe. Por baixo, o Sequelize usa o driver
// mysql2 para conversar com o MySQL.
//
// POOL DE CONEXÕES
// Abrir uma conexão com o banco é lento. Por isso o Sequelize abre algumas e reaproveita: cada
// requisição pega uma emprestada, usa e devolve. Esse conjunto é o "pool" (tamanho: DB_POOL_SIZE).
//
// SENHA DO BANCO
// Usuário e senha NÃO ficam no código nem no local.env: ficam num secret do Secret Manager
// (o nome do secret está em DB_CREDENTIALS_SECRET_NAME). O secret é um JSON em um destes formatos:
//   local (Docker), conexão por rede:
//     { "username": "my_user", "password": "my_pwd", "host": "db", "port": 3306 }
//   Cloud Run + Cloud SQL, conexão pelo socket que o Cloud Run cria para a instância:
//     { "username": "...", "password": "...", "socket_path": "/cloudsql/PROJETO:REGIAO:INSTANCIA" }

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
  logging: false, // true mostra no terminal cada SQL executado (útil para estudar o que o ORM faz)
  pool: { max: DB_POOL_SIZE, idle: 60_000 },
  hooks: {
    // roda antes de abrir cada conexão nova: preenche usuário, senha e onde o banco está
    beforeConnect: async (config) => {
      if (CredentialsCache.credentials === null) {
        const secretValue = await SecretManagerConnector.getSecretByName(DB_CREDENTIALS_SECRET_NAME)
        CredentialsCache.credentials = JSON.parse(secretValue)
      }

      const credentials = CredentialsCache.credentials
      config.username = credentials.username
      config.password = credentials.password

      if (credentials.socket_path) {
        // Cloud SQL no Cloud Run: o banco é acessado por um arquivo de socket, não por host e porta
        config.dialectOptions = { ...config.dialectOptions, socketPath: credentials.socket_path }
      } else {
        config.host = credentials.host
        config.port = credentials.port
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
