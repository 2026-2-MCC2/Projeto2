import { NotFoundResource } from '../errors/index.js'

export class SinkResource {
  onRequest(req, res) {
    throw new NotFoundResource()
  }
}
