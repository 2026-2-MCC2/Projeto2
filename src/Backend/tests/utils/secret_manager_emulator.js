import { SecretManagerServiceClient } from '@google-cloud/secret-manager'
import { credentials } from '@grpc/grpc-js'

export class SecretManagerEmulator {
  static getClient() {
    const [host, port] = (process.env.SECRET_MANAGER_EMULATOR_HOST ?? 'localhost:9090').split(':')
    return new SecretManagerServiceClient({
      servicePath: host,
      port: Number(port),
      sslCreds: credentials.createInsecure(),
      universeDomain: 'googleapis.com',
    })
  }

  static async createSecret(secretName, secretValue) {
    const projectPath = `projects/${process.env.GCP_PROJECT_ID}`
    const secretPath = `${projectPath}/secrets/${secretName}`
    const client = SecretManagerEmulator.getClient()

    try {
      await client.deleteSecret({ name: secretPath }).catch(() => {})
      await client.createSecret({ parent: projectPath, secretId: secretName, secret: { replication: { automatic: {} } } })
      await client.addSecretVersion({ parent: secretPath, payload: { data: Buffer.from(secretValue) } })
    } finally {
      await client.close()
    }
  }
}
