// GET /event_planning/health_check
// Diz se a API está funcionando. Não pede login. Usado pelo Cloud Run, por monitoramento e pelos testes.
//   204 (sem body)  a API está de pé e o banco respondeu
//   503 (sem body)  a API está de pé, mas não consegue falar com o banco
//
// Por que testar o banco? Uma API que não alcança o banco não consegue atender quase nada.
// Respondendo 503, quem monitora percebe o problema na hora, em vez de só ver os erros 500 depois.

import { DatabaseConnector } from '../connectors/database_connector.js'

export class HealthCheckResource {
  async onGet(req, res) {
    const isDatabaseAvailable = await DatabaseConnector.isAvailable()

    if (!isDatabaseAvailable) {
      res.status(503).end()
      return
    }

    res.status(204).end()
  }
}
