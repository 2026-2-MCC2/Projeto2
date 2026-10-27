// Recebe toda requisição que não bateu com nenhuma rota e responde 404 (code APP000404).
// É registrado depois de todas as rotas, com addSink no app.js.

import { NotFoundResource } from '../errors/index.js'

export class SinkResource {
  onRequest(req, res) {
    throw new NotFoundResource()
  }
}
