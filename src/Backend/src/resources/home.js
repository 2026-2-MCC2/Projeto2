// GET /event_planning/
// Mostra qual versão (commit) está no ar, para conferir um deploy. Não pede token.
//   curl localhost:3300/event_planning/
//   200 { "trocaticket-event-planning-api": "<commit>" }

import { GIT_COMMIT, SERVICE_NAME } from '../constants.js'

export class HomeResource {
  onGet(req, res) {
    res.status(200).json({ [SERVICE_NAME]: GIT_COMMIT })
  }
}
