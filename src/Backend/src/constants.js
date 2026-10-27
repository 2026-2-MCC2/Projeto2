// Configurações da aplicação, lidas das variáveis de ambiente.
// Local: vêm do arquivo local.env. No Cloud Run: definidas no deploy (.github/workflows/backend.yml, na raiz do repositório).
// Para usar em outro arquivo: import { APP_ENV } from '../constants.js'

import { fileURLToPath } from 'node:url'

// pasta dos arquivos JSON Schema (src/schemas/)
export const SCHEMA_PATH = fileURLToPath(new URL('./schemas/', import.meta.url))

// Começo de todas as URLs da API, ex.: /event_planning/health_check
// Fica numa constante para o app.js e as listas de rotas abaixo usarem sempre o mesmo valor.
export const API_PREFIX = '/event_planning'

// commit e branch do deploy, mostrados no GET /event_planning/
export const GIT_COMMIT = process.env.GIT_COMMIT ?? '$$GIT_COMMIT'
export const GIT_BRANCH = process.env.GIT_BRANCH ?? '$$GIT_BRANCH'

// porta HTTP; o Cloud Run define a variável PORT sozinho
export const PORT = Number(process.env.PORT ?? 3300)

// local | test | production. Em local/test os logs saem em texto; nos outros, em JSON.
export const APP_ENV = process.env.APP_ENV ?? ''
export const IS_LOCAL = ['LOCAL', 'TEST'].includes(APP_ENV.toUpperCase())

// nome que aparece nos logs (ex.: trocaticket-event-planning-api)
export const SERVICE_NAME = process.env.SERVICE_NAME ?? ''

// projeto do Google Cloud onde estão os secrets
export const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID ?? ''

// banco de dados: nome do banco e nome do secret com usuário/senha/host/porta
export const DB_NAME = process.env.DB_NAME ?? ''
export const DB_CREDENTIALS_SECRET_NAME = process.env.DB_CREDENTIALS_SECRET_NAME ?? ''
// quantas conexões com o banco cada instância da API mantém abertas
export const DB_POOL_SIZE = Number(process.env.DB_POOL_SIZE ?? 5)

// LOGIN (JWT)
// Nome do secret do Secret Manager que guarda a chave usada para assinar os tokens de login.
// Quem tiver essa chave consegue criar tokens válidos, por isso ela nunca fica no código.
export const JWT_SECRET_NAME = process.env.JWT_SECRET_NAME ?? ''
// Por quanto tempo um token de login vale. Depois disso o usuário precisa logar de novo.
// Formato da biblioteca jsonwebtoken: '8h' (8 horas), '30m' (30 minutos), '7d' (7 dias).
export const JWT_EXPIRATION = process.env.JWT_EXPIRATION ?? '8h'

// CORS
// Endereços dos sites (front-end) que podem chamar a API pelo navegador, separados por vírgula.
// Ex.: 'http://localhost:5173,https://event_planning-front-xyz.a.run.app'
export const CORS_ALLOWED_ORIGINS = (process.env.CORS_ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter((origin) => origin !== '')

// só no ambiente local: endereço do emulador do Secret Manager (ex.: localhost:9090)
export const SECRET_MANAGER_EMULATOR_HOST = process.env.SECRET_MANAGER_EMULATOR_HOST ?? ''

// Perfis de usuário do sistema. Use sempre estas constantes em vez de escrever o texto na mão,
// assim um erro de digitação vira erro de JavaScript em vez de um bug silencioso:
//   SecurityTools.requireProfile(req.context, [USER_PROFILES.ORGANIZER])
export const USER_PROFILES = Object.freeze({
  ADMIN: 'admin',
  ORGANIZER: 'organizador',
  SUPPLIER: 'fornecedor',
})

// Rotas "de infraestrutura": não passam pelos middlewares de log, login e banco.
export const BYPASS_ENDPOINTS = [API_PREFIX, `${API_PREFIX}/`, `${API_PREFIX}/health_check`]

// Rotas que funcionam SEM login (sem o header Authorization).
// Toda rota que não está aqui exige um token válido. Assim, se alguém esquecer de proteger uma
// rota nova, ela já nasce protegida.
// Quando criarem o login e o autocadastro, coloquem as URLs deles aqui.
export const PUBLIC_ENDPOINTS = [...BYPASS_ENDPOINTS, `${API_PREFIX}/auth/login`, `${API_PREFIX}/auth/cadastro`]

// Chamada no server.js. Se faltar alguma variável, a aplicação nem sobe e mostra quais faltam.
export function checkVariables() {
  const requiredVariables = {
    APP_ENV,
    SERVICE_NAME,
    GCP_PROJECT_ID,
    DB_NAME,
    DB_CREDENTIALS_SECRET_NAME,
    JWT_SECRET_NAME,
  }

  const variablesWithoutValue = []
  for (const [name, value] of Object.entries(requiredVariables)) {
    if (!value) {
      variablesWithoutValue.push(name)
    }
  }

  if (variablesWithoutValue.length > 0) {
    throw new Error(`An error occurred while checking variables, please verify these variables without values: ${variablesWithoutValue}`)
  }
}
