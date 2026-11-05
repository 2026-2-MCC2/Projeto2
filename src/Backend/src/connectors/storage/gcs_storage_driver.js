// Driver "gcs": guarda os arquivos num bucket privado do Google Cloud Storage (produção).
//
// Autenticação: as credenciais padrão do ambiente (Application Default Credentials). No Cloud Run
// são as da service account do serviço; nenhuma chave JSON fica no código ou no repositório.
// A URL de leitura é uma URL assinada (v4) com validade curta. No Cloud Run, sem chave privada, a
// biblioteca assina pela API do IAM (signBlob): a service account precisa poder assinar em nome de
// si mesma (papel "Service Account Token Creator" nela própria).

import { assertValidObjectPath } from './object_path.js'

export class GcsStorageDriver {
  // client: um Storage do @google-cloud/storage (nos testes, um objeto simulado com a mesma forma)
  constructor({ client, bucketName, expirationSeconds, now = () => Date.now() }) {
    this.bucket = client.bucket(bucketName)
    this.expirationSeconds = expirationSeconds
    this.now = now
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

  async getUrl(path) {
    assertValidObjectPath(path)
    const [url] = await this.bucket.file(path).getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: this.now() + this.expirationSeconds * 1000,
    })
    return url
  }
}
