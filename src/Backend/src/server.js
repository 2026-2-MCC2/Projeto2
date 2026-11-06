import { create } from './app.js'
import { DatabaseConnector } from './connectors/database_connector.js'
import { checkVariables, PORT } from './constants.js'
import { errorVerification } from './errors/index.js'
import { Logger } from './utils/logger.js'

const logger = new Logger(null, 'server')

function main() {
  // a aplicação nem sobe se houver código de erro repetido ou variável de ambiente faltando
  errorVerification()
  checkVariables()

  const app = create()
  const server = app.listen(PORT, (error) => {
    if (error) {
      throw error
    }
    logger.info(`Listening on port ${PORT}`)
  })

  // o Cloud Run manda SIGTERM antes de desligar uma instância
  async function shutdown(signal) {
    logger.info(`${signal} received, shutting down`)
    server.close()
    await DatabaseConnector.close()
  }

  process.once('SIGTERM', () => shutdown('SIGTERM'))
  process.once('SIGINT', () => shutdown('SIGINT'))
}

main()
