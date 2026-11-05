// Middleware: limita tentativas nas rotas que um robô usaria para adivinhar senhas, descobrir
// e-mails e CNPJs cadastrados ou disparar e-mails. Passou do limite: 429 (EVP000049) com o header
// Retry-After dizendo em quantos segundos pode tentar de novo.
//
//   por IP e rota       toda requisição conta (RATE_LIMIT_MAX_REQUESTS_PER_IP)
//   por e-mail (login)  só senha errada conta, de qualquer IP, e um login certo zera
//                       (RATE_LIMIT_MAX_FAILED_LOGINS_PER_EMAIL)
//
// O IP vem de req.ip, que atrás do Cloud Run depende do "trust proxy" configurado em app.js.

import {
  API_PREFIX,
  RATE_LIMIT_MAX_FAILED_LOGINS_PER_EMAIL,
  RATE_LIMIT_MAX_REQUESTS_PER_IP,
  RATE_LIMIT_WINDOW_SECONDS,
} from '../constants.js'
import { TooManyAttempts } from '../errors/index.js'
import { RateLimiter } from '../utils/rate_limiter.js'
import { TextTools } from '../utils/text_tools.js'

const LOGIN_PATH = `${API_PREFIX}/auth/login`

const LIMITED_PATHS = new Set([
  LOGIN_PATH,
  `${API_PREFIX}/auth/cadastro`,
  `${API_PREFIX}/auth/verificar-cnpj`,
  `${API_PREFIX}/auth/esqueci-senha`,
  `${API_PREFIX}/auth/redefinir-senha`,
  `${API_PREFIX}/me/senha`,
])

const requestsPerIp = new RateLimiter({ maxHits: RATE_LIMIT_MAX_REQUESTS_PER_IP, windowSeconds: RATE_LIMIT_WINDOW_SECONDS })
const failedLoginsPerEmail = new RateLimiter({
  maxHits: RATE_LIMIT_MAX_FAILED_LOGINS_PER_EMAIL,
  windowSeconds: RATE_LIMIT_WINDOW_SECONDS,
})

// o Express aceita a rota com maiúsculas e com barra no fim; todas as grafias contam juntas
function normalizePath(path) {
  return path.toLowerCase().replace(/\/+$/, '')
}

function loginEmail(req) {
  const email = req.context.media?.email
  return typeof email === 'string' ? TextTools.normalizeEmail(email) : null
}

function throwIfBlocked(res, limiter, key) {
  const retryAfterSeconds = limiter.secondsUntilAllowed(key)
  if (retryAfterSeconds > 0) {
    res.set('Retry-After', String(retryAfterSeconds))
    throw new TooManyAttempts(retryAfterSeconds)
  }
}

export class RateLimitMiddleware {
  processRequest(req, res) {
    if (req.method === 'OPTIONS') return

    const path = normalizePath(req.path)
    if (!LIMITED_PATHS.has(path)) return

    const ipKey = `${req.ip} ${path}`
    throwIfBlocked(res, requestsPerIp, ipKey)
    requestsPerIp.hit(ipKey)

    if (path === LOGIN_PATH) {
      const email = loginEmail(req)
      if (email !== null) throwIfBlocked(res, failedLoginsPerEmail, email)
    }
  }

  processResponse(req, res) {
    if (req.method === 'OPTIONS' || normalizePath(req.path) !== LOGIN_PATH) return

    const email = loginEmail(req)
    if (email === null) return

    if (res.statusCode === 401) failedLoginsPerEmail.hit(email)
    if (res.statusCode === 200) failedLoginsPerEmail.reset(email)
  }
}
