// Armazenamento de arquivos (fotos das propostas), com a mesma interface nos dois drivers:
//   const path = await StorageConnector.save(buffer, 'image/jpeg', 'proposals/<proposal_key>/1-<uuid>.jpg')
//   const url = await StorageConnector.getUrl(path)   // leitura com validade curta
//   await StorageConnector.remove(path)
// No banco vai o caminho do objeto (proposal_photo.url), nunca a URL: ela vence em minutos e é
// pedida de novo a cada leitura.
//
// O driver vem do STORAGE_DRIVER (ver constants.js):
//   local  STORAGE_LOCAL_DIR e STORAGE_LOCAL_PUBLIC_URL; arquivos servidos por resources/local_file.js
//   gcs    GCS_BUCKET; credenciais padrão do ambiente (no Cloud Run, a service account do serviço)
// As variáveis só são conferidas no primeiro uso, para a API subir mesmo onde ainda não há fotos.

import { Storage } from '@google-cloud/storage'

import { GCS_BUCKET, STORAGE_DRIVER, STORAGE_LOCAL_DIR, STORAGE_LOCAL_PUBLIC_URL, STORAGE_URL_EXPIRATION_SECONDS } from '../../constants.js'
import { SecurityTools } from '../../utils/security_tools.js'
import { GcsStorageDriver } from './gcs_storage_driver.js'
import { LocalStorageDriver } from './local_storage_driver.js'

export const STORAGE_DRIVERS = Object.freeze({ LOCAL: 'local', GCS: 'gcs' })

// Monta o driver a partir da configuração. Exportada para os testes passarem a sua (e um cliente
// do GCS simulado) sem depender das variáveis de ambiente.
export function createStorageDriver({ driver, gcsBucket, localDirectory, localPublicUrl, expirationSeconds, gcsClient, getSigningKey }) {
  if (driver === STORAGE_DRIVERS.LOCAL) {
    requireSettings({ STORAGE_LOCAL_DIR: localDirectory, STORAGE_LOCAL_PUBLIC_URL: localPublicUrl })
    return new LocalStorageDriver({
      directory: localDirectory,
      publicUrl: localPublicUrl,
      expirationSeconds,
      // a URL local é assinada com a mesma chave dos tokens de login (já existe e fica no Secret Manager)
      getSigningKey: getSigningKey ?? (() => SecurityTools.getJwtSecret()),
    })
  }

  if (driver === STORAGE_DRIVERS.GCS) {
    requireSettings({ GCS_BUCKET: gcsBucket })
    return new GcsStorageDriver({ client: gcsClient ?? new Storage(), bucketName: gcsBucket, expirationSeconds })
  }

  throw new Error(`STORAGE_DRIVER must be "${STORAGE_DRIVERS.LOCAL}" or "${STORAGE_DRIVERS.GCS}", got ${JSON.stringify(driver)}`)
}

function requireSettings(settings) {
  const missing = Object.entries(settings)
    .filter(([, value]) => !value)
    .map(([name]) => name)
  if (missing.length > 0) {
    throw new Error(`Storage is not configured, please set: ${missing.join(', ')}`)
  }
}

export class StorageConnector {
  // driver criado uma vez, no primeiro uso, e reaproveitado
  static driver = null

  static getDriver() {
    if (StorageConnector.driver === null) {
      StorageConnector.driver = createStorageDriver({
        driver: STORAGE_DRIVER,
        gcsBucket: GCS_BUCKET,
        localDirectory: STORAGE_LOCAL_DIR,
        localPublicUrl: STORAGE_LOCAL_PUBLIC_URL,
        expirationSeconds: STORAGE_URL_EXPIRATION_SECONDS,
      })
    }
    return StorageConnector.driver
  }

  static async save(buffer, contentType, path) {
    return StorageConnector.getDriver().save(buffer, contentType, path)
  }

  static async remove(path) {
    return StorageConnector.getDriver().remove(path)
  }

  static async getUrl(path) {
    return StorageConnector.getDriver().getUrl(path)
  }

  // só o driver local tem leitura pela API; no gcs o navegador lê direto do bucket pela URL assinada
  static async readLocalFile(path, signedQuery) {
    const driver = StorageConnector.getDriver()
    if (!(driver instanceof LocalStorageDriver)) return null
    return driver.read(path, signedQuery)
  }
}
