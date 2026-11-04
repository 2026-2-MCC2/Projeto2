// Serve os arquivos do driver local de armazenamento (connectors/storage/), só em desenvolvimento e
// testes. Em produção (driver gcs) o navegador lê direto do bucket, pela URL assinada do Google.
//
// GET /event_planning/files/<caminho>?expires=<segundos>&signature=<assinatura>
//   200 o arquivo, com o Content-Type pela extensão
//   404 assinatura errada, URL vencida, caminho inválido ou arquivo que não existe (sem dizer qual)
//
// Não passa pelos middlewares de login e de banco (ver app.js): uma tag <img> não manda o token,
// e quem protege o arquivo é a assinatura da URL, gerada por StorageConnector.getUrl.

import { StorageConnector } from '../connectors/storage/index.js'

export class LocalFileResource {
  async onGet(req, res) {
    // no Express 5, o curinga *path chega como a lista dos pedaços do caminho
    const path = [req.params.path].flat().join('/')
    const file = await StorageConnector.readLocalFile(path, {
      expires: req.query.expires,
      signature: req.query.signature,
    })

    if (file === null) {
      res.status(404).end()
      return
    }

    res.set({
      'Content-Type': file.contentType,
      'Cache-Control': 'private, max-age=0',
      'X-Content-Type-Options': 'nosniff',
    })
    res.status(200).send(file.buffer)
  }
}
