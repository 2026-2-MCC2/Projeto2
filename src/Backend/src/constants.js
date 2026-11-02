import { fileURLToPath } from 'node:url'

export const SCHEMA_PATH = fileURLToPath(new URL('./schemas/', import.meta.url))

export const API_PREFIX = '/event_planning'

export const GIT_COMMIT = process.env.GIT_COMMIT ?? '$$GIT_COMMIT'
export const GIT_BRANCH = process.env.GIT_BRANCH ?? '$$GIT_BRANCH'

// o cloud run define PORT sozinho
export const PORT = Number(process.env.PORT ?? 3300)

// local | test | production
export const APP_ENV = process.env.APP_ENV ?? ''
export const IS_LOCAL = ['LOCAL', 'TEST'].includes(APP_ENV.toUpperCase())

export const SERVICE_NAME = process.env.SERVICE_NAME ?? ''

export const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID ?? ''

export const DB_NAME = process.env.DB_NAME ?? ''
export const DB_CREDENTIALS_SECRET_NAME = process.env.DB_CREDENTIALS_SECRET_NAME ?? ''
// conexões abertas por instância da api
export const DB_POOL_SIZE = Number(process.env.DB_POOL_SIZE ?? 5)

// quem tem essa chave cria tokens válidos, por isso ela fica no secret manager e nunca no código
export const JWT_SECRET_NAME = process.env.JWT_SECRET_NAME ?? ''
// formato do jsonwebtoken: '8h', '30m', '7d'
export const JWT_EXPIRATION = process.env.JWT_EXPIRATION ?? '8h'

export const CORS_ALLOWED_ORIGINS = (process.env.CORS_ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter((origin) => origin !== '')

export const SMTP_HOST = process.env.SMTP_HOST ?? ''
export const SMTP_PORT = Number(process.env.SMTP_PORT ?? 587)
// secret com { "user": "...", "password": "..." }; vazio = servidor sem login (mailpit local)
export const SMTP_CREDENTIALS_SECRET_NAME = process.env.SMTP_CREDENTIALS_SECRET_NAME ?? ''
export const EMAIL_FROM = process.env.EMAIL_FROM ?? ''
export const FRONT_URL = process.env.FRONT_URL ?? ''

export const PASSWORD_RESET_EXPIRATION_MINUTES = Number(process.env.PASSWORD_RESET_EXPIRATION_MINUTES ?? 60)
// intervalo mínimo entre dois pedidos de redefinição para a mesma conta, contra abuso
export const PASSWORD_RESET_COOLDOWN_SECONDS = Number(process.env.PASSWORD_RESET_COOLDOWN_SECONDS ?? 120)

export const SECRET_MANAGER_EMULATOR_HOST = process.env.SECRET_MANAGER_EMULATOR_HOST ?? ''

export const USER_PROFILES = Object.freeze({
  ADMIN: 'admin',
  ORGANIZER: 'organizador',
  SUPPLIER: 'fornecedor',
})

// mesmos valores do enum status da tabela user
export const USER_STATUSES = Object.freeze({
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  BLOCKED: 'blocked',
})

// rotas de infraestrutura: não passam pelos middlewares de log, login e banco
export const BYPASS_ENDPOINTS = [API_PREFIX, `${API_PREFIX}/`, `${API_PREFIX}/health_check`]

// toda rota fora desta lista exige token, assim uma rota nova já nasce protegida
export const PUBLIC_ENDPOINTS = [
  ...BYPASS_ENDPOINTS,
  `${API_PREFIX}/auth/login`,
  `${API_PREFIX}/auth/cadastro`,
  `${API_PREFIX}/auth/esqueci-senha`,
  `${API_PREFIX}/auth/redefinir-senha`,
]

export function checkVariables() {
  const requiredVariables = {
    APP_ENV,
    SERVICE_NAME,
    GCP_PROJECT_ID,
    DB_NAME,
    DB_CREDENTIALS_SECRET_NAME,
    JWT_SECRET_NAME,
    SMTP_HOST,
    EMAIL_FROM,
    FRONT_URL,
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
