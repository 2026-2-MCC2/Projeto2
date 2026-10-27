// GET /event_planning/
// Mostra qual versão está no ar. Não pede token.
//   curl localhost:3300/event_planning/
//   200 { "trocaticket-event-planning-api": "<commit>", "id": "<pid do processo>", "branch": "<branch>" }

import { GIT_BRANCH, GIT_COMMIT, SERVICE_NAME } from '../constants.js'

export class HomeResource {
  onGet(req, res) {
    res.status(200).json({
      [SERVICE_NAME]: GIT_COMMIT,
      id: String(process.pid),
      branch: GIT_BRANCH,
    })
  }
}
