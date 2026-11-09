import { Storage } from '@google-cloud/storage'

import { GCS_BUCKET, STORAGE_DRIVER, STORAGE_LOCAL_DIR, STORAGE_LOCAL_PUBLIC_URL, STORAGE_URL_EXPIRATION_SECONDS } from '../../constants.js'
import { SecurityTools } from '../../utils/security_tools.js'
import { GcsStorageDriver } from './gcs_storage_driver.js'
import { LocalStorageDriver } from './local_storage_driver.js'

export const STORAGE_DRIVERS = Object.freeze({ LOCAL: 'local', GCS: 'gcs' })

// as variáveis só são conferidas no primeiro uso, para a API subir mesmo onde ainda não há fotos
function createStorageDriver({ driver, gcsBucket, localDirectory, localPublicUrl, expirationSeconds }) {
  if (driver === STORAGE_DRIVERS.LOCAL) {
    requireSettings({ STORAGE_LOCAL_DIR: localDirectory, STORAGE_LOCAL_PUBLIC_URL: localPublicUrl })
    return new LocalStorageDriver({
      directory: localDirectory,
      publicUrl: localPublicUrl,
      expirationSeconds,
      // a URL local é assinada com a mesma chave dos tokens de login (já existe e fica no Secret Manager)
      getSigningKey: () => SecurityTools.getJwtSecret(),
    })
  }

  if (driver === STORAGE_DRIVERS.GCS) {
    requireSettings({ GCS_BUCKET: gcsBucket })
    return new GcsStorageDriver({ client: new Storage(), bucketName: gcsBucket, expirationSeconds })
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
