import { assertValidObjectPath } from './object_path.js'

export class GcsStorageDriver {
  constructor({ client, bucketName, expirationSeconds }) {
    this.bucket = client.bucket(bucketName)
    this.expirationSeconds = expirationSeconds
  }

  async save(buffer, contentType, path) {
    assertValidObjectPath(path)
    // fotos são pequenas: upload em uma requisição só, sem o modo "resumable"
    await this.bucket.file(path).save(buffer, { contentType, resumable: false })
    return path
  }

  // apagar o que não existe não é erro (mesmo comportamento do driver local)
  async remove(path) {
    assertValidObjectPath(path)
    await this.bucket.file(path).delete({ ignoreNotFound: true })
  }

  // no Cloud Run, sem chave privada, a assinatura vai pelo IAM: a service account precisa do papel Token Creator nela própria
  async getUrl(path) {
    assertValidObjectPath(path)
    const [url] = await this.bucket.file(path).getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + this.expirationSeconds * 1000,
    })
    return url
  }
}
