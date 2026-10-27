// Lê secrets do Secret Manager do Google Cloud.
//
// Secret é qualquer informação sensível (senha do banco, token de acesso). Ela não pode ficar no
// código, porque o código vai para o GitHub e qualquer um com acesso ao repositório veria. O Secret
// Manager é um "cofre" do Google Cloud: a aplicação pede o secret pelo nome e só quem tem permissão
// consegue ler.
//
// Exemplo:
//   const token = await SecretManagerConnector.getSecretByName('internal_token')
//   // token = 'default_token'
//
// Local: conecta no emulador do docker-compose (SECRET_MANAGER_EMULATOR_HOST). Os secrets do
// emulador são criados pelos testes (tests/global_setup.js).
// Cloud Run: conecta no Secret Manager de verdade, autenticado pela service account do serviço.

import { SecretManagerServiceClient } from '@google-cloud/secret-manager'
import { credentials } from '@grpc/grpc-js'

import { GCP_PROJECT_ID, SECRET_MANAGER_EMULATOR_HOST } from '../constants.js'
import { Logger } from '../utils/logger.js'

const logger = new Logger(null, 'SecretManagerConnector')

export class SecretManagerConnector {
  // cliente criado uma vez e reaproveitado
  static client = null

  static getClient() {
    if (SecretManagerConnector.client !== null) {
      return SecretManagerConnector.client
    }

    if (SECRET_MANAGER_EMULATOR_HOST) {
      // O emulador não usa TLS nem autenticação. O universeDomain evita que a biblioteca
      // procure o servidor de metadados do Google Cloud, o que travava a primeira chamada por ~4s.
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

  // Devolve o valor da versão mais recente do secret, como texto.
  static async getSecretByName(secretName) {
    logger.debug(`Going for secret ${secretName}`)

    const client = SecretManagerConnector.getClient()
    const [version] = await client.accessSecretVersion({
      name: `projects/${GCP_PROJECT_ID}/secrets/${secretName}/versions/latest`,
    })

    // o valor vem em bytes; converte para texto
    return Buffer.from(version.payload.data).toString('utf8')
  }
}
