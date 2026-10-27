// Ponto de entrada: é este arquivo que roda com "node src/server.js".
// Confere a configuração, sobe o servidor HTTP e trata o desligamento.

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

  // O Cloud Run manda SIGTERM antes de desligar uma instância (e o Ctrl+C manda SIGINT).
  // Paramos de aceitar requisições e fechamos as conexões com o banco.
  async function shutdown(signal) {
    logger.info(`${signal} received, shutting down`)
    server.close()
    await DatabaseConnector.close()
  }

  process.once('SIGTERM', () => shutdown('SIGTERM'))
  process.once('SIGINT', () => shutdown('SIGINT'))
}

main()
