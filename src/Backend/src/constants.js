import { fileURLToPath } from 'node:url'

export const SCHEMA_PATH = fileURLToPath(new URL('./schemas/', import.meta.url))

export const API_PREFIX = '/event_planning'

export const GIT_COMMIT = process.env.GIT_COMMIT ?? '$$GIT_COMMIT'

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

// Armazenamento de arquivos (fotos das propostas), ver connectors/storage/:
//   local  pasta do servidor (desenvolvimento e testes); a própria API serve os arquivos
//   gcs    bucket privado do Google Cloud Storage (produção), com URL assinada de leitura
// Não entram no checkVariables: o deploy atual não as define, e só quem grava ou lê arquivo
// precisa delas (o módulo confere na primeira vez que é usado).
export const STORAGE_DRIVER = process.env.STORAGE_DRIVER ?? ''
export const GCS_BUCKET = process.env.GCS_BUCKET ?? ''
export const STORAGE_LOCAL_DIR = process.env.STORAGE_LOCAL_DIR ?? ''
// endereço público da rota que serve os arquivos locais, ex.: http://localhost:3300/event_planning/files
export const STORAGE_LOCAL_PUBLIC_URL = process.env.STORAGE_LOCAL_PUBLIC_URL ?? ''
// validade das URLs de leitura (assinadas no GCS, com assinatura da API no local)
export const STORAGE_URL_EXPIRATION_SECONDS = Number(process.env.STORAGE_URL_EXPIRATION_SECONDS ?? 900)

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

export const EVENT_STATUSES = Object.freeze({
  DRAFT: 'draft',
  OPEN_FOR_QUOTES: 'open_for_quotes',
  CLOSED: 'closed',
  CANCELED: 'canceled',
})

// encerrado e cancelado são finais: o evento não volta a ser editado nem cotado
export const EVENT_STATUS_TRANSITIONS = Object.freeze({
  [EVENT_STATUSES.DRAFT]: [EVENT_STATUSES.OPEN_FOR_QUOTES, EVENT_STATUSES.CANCELED],
  [EVENT_STATUSES.OPEN_FOR_QUOTES]: [EVENT_STATUSES.CLOSED, EVENT_STATUSES.CANCELED],
  [EVENT_STATUSES.CLOSED]: [],
  [EVENT_STATUSES.CANCELED]: [],
})

export const isFinalEventStatus = (status) => EVENT_STATUS_TRANSITIONS[status]?.length === 0

export const REFERENCE_SCENARIOS = Object.freeze({
  MINIMUM: 'minimum',
  EXPECTED: 'expected',
  MAXIMUM: 'maximum',
})

export const INTERNAL_COST_TYPES = Object.freeze({
  TAX: 'tax',
  OPERATIONAL: 'operational',
  OTHER: 'other',
})

// status da proposta (ENUM proposal.status do banco); só a enviada ainda pode ser editada ou retirada
export const PROPOSAL_STATUSES = Object.freeze({
  SENT: 'sent',
  UNDER_REVIEW: 'under_review',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  CANCELED: 'canceled',
})

// rotas de infraestrutura: não passam pelos middlewares de log, login e banco
export const BYPASS_ENDPOINTS = [API_PREFIX, `${API_PREFIX}/`, `${API_PREFIX}/health_check`]

// toda rota fora desta lista exige token, assim uma rota nova já nasce protegida
export const PUBLIC_ENDPOINTS = [
  ...BYPASS_ENDPOINTS,
  `${API_PREFIX}/auth/login`,
  `${API_PREFIX}/auth/cadastro`,
  `${API_PREFIX}/auth/verificar-cnpj`,
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
