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
