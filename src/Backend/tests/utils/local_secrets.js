// valores só do ambiente local (docker); em produção os secrets ficam no secret manager

import { SecretManagerEmulator } from './secret_manager_emulator.js'

// credenciais do MySQL do docker-compose; "db" é o nome do container do banco
const LOCAL_DB_CREDENTIALS = { username: 'my_user', password: 'my_pwd', host: 'db', port: 3306 }

// mysql do docker visto de fora do docker; a porta segue a DB_PORT do docker-compose
export const LOCAL_DATABASE_URL = `mysql://${LOCAL_DB_CREDENTIALS.username}:${LOCAL_DB_CREDENTIALS.password}@localhost:${process.env.DB_PORT ?? 3306}/${process.env.DB_NAME ?? 'event_planning'}`

export const LOCAL_JWT_SECRET = 'chave_local_apenas_para_desenvolvimento'

export async function createLocalSecrets() {
  await SecretManagerEmulator.createSecret(process.env.DB_CREDENTIALS_SECRET_NAME, JSON.stringify(LOCAL_DB_CREDENTIALS))
  await SecretManagerEmulator.createSecret(process.env.JWT_SECRET_NAME, LOCAL_JWT_SECRET)
}
