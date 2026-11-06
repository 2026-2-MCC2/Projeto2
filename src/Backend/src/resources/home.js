import { GIT_COMMIT, SERVICE_NAME } from '../constants.js'

export class HomeResource {
  onGet(req, res) {
    res.status(200).json({ [SERVICE_NAME]: GIT_COMMIT })
  }
}
