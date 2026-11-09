import { DatabaseConnector } from '../connectors/database_connector.js'

export class HealthCheckResource {
  async onGet(req, res) {
    const isDatabaseAvailable = await DatabaseConnector.isAvailable()

    // 503 em vez de 500s espalhados: quem monitora percebe na hora que o banco caiu
    if (!isDatabaseAvailable) {
      res.status(503).end()
      return
    }

    res.status(204).end()
  }
}
