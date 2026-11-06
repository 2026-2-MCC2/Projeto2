import { SecretManagerServiceClient } from '@google-cloud/secret-manager'
import { credentials } from '@grpc/grpc-js'

import { GCP_PROJECT_ID, SECRET_MANAGER_EMULATOR_HOST } from '../constants.js'
import { Logger } from '../utils/logger.js'

const logger = new Logger(null, 'SecretManagerConnector')

export class SecretManagerConnector {
  static client = null

  static getClient() {
    if (SecretManagerConnector.client !== null) {
      return SecretManagerConnector.client
    }

    if (SECRET_MANAGER_EMULATOR_HOST) {
      // o universeDomain evita que a biblioteca procure o servidor de metadados do Google, o que travava ~4s
      const [host, port] = SECRET_MANAGER_EMULATOR_HOST.split(':')
      SecretManagerConnector.client = new SecretManagerServiceClient({
        servicePath: host,
        port: Number(port),
        sslCreds: credentials.createInsecure(),
        universeDomain: 'googleapis.com',
      })
    } else {
      SecretManagerConnector.client = new SecretManagerServiceClient()
    }

    return SecretManagerConnector.client
  }

  static async getSecretByName(secretName) {
    logger.debug(`Going for secret ${secretName}`)

    const client = SecretManagerConnector.getClient()
    const [version] = await client.accessSecretVersion({
      name: `projects/${GCP_PROJECT_ID}/secrets/${secretName}/versions/latest`,
    })

    return Buffer.from(version.payload.data).toString('utf8')
  }
}
