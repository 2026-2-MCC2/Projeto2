// Valores dos secrets do ambiente LOCAL (Docker). Não são segredos de verdade: só funcionam na sua
// máquina. Em produção os valores ficam no Secret Manager do Google Cloud e nunca no código.
//
// Usado por:
//   tests/global_setup.js        cria os secrets antes do "npm test"
//   scripts/setup_local.js       cria os secrets para usar a API na mão (npm run setup:local)
//   scripts/generate_token.js    gera um token de login de teste (npm run token)

import { SecretManagerEmulator } from './secret_manager_emulator.js'

// credenciais do MySQL do docker-compose; "db" é o nome do container do banco
export const LOCAL_DB_CREDENTIALS = { username: 'my_user', password: 'my_pwd', host: 'db', port: 3306 }

// chave que assina os tokens de login no ambiente local
export const LOCAL_JWT_SECRET = 'chave_local_apenas_para_desenvolvimento'

export async function createLocalSecrets() {
  await SecretManagerEmulator.createSecret(process.env.DB_CREDENTIALS_SECRET_NAME, JSON.stringify(LOCAL_DB_CREDENTIALS))
  await SecretManagerEmulator.createSecret(process.env.JWT_SECRET_NAME, LOCAL_JWT_SECRET)
}
