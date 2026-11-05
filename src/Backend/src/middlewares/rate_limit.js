// Middleware: limita tentativas nas rotas que um robô usaria para adivinhar senhas, descobrir
// e-mails e CNPJs cadastrados ou disparar e-mails. Passou do limite: 429 (EVP000049) com o header
// Retry-After dizendo em quantos segundos pode tentar de novo.
//
//   por IP e rota       toda requisição conta (RATE_LIMIT_MAX_REQUESTS_PER_IP)
//   por IP e e-mail     só senha errada conta, e um login certo zera
//   (login)             (RATE_LIMIT_MAX_FAILED_LOGINS_PER_EMAIL)
//
// A contagem de senhas erradas é por IP e e-mail, não só por e-mail: a trava vem antes de conferir a
// senha, então uma contagem só por e-mail deixaria qualquer um bloquear o login do dono da conta
// errando a senha dele de outro lugar. Quem tenta de muitos IPs continua barrado pelo limite por IP.
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

function loginKey(req) {
  const email = req.context.media?.email
  return typeof email === 'string' ? `${req.ip} ${TextTools.normalizeEmail(email)}` : null
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
      const key = loginKey(req)
      if (key !== null) throwIfBlocked(res, failedLoginsPerEmail, key)
    }
  }

  processResponse(req, res) {
    if (req.method === 'OPTIONS' || normalizePath(req.path) !== LOGIN_PATH) return

    const key = loginKey(req)
    if (key === null) return

    if (res.statusCode === 401) failedLoginsPerEmail.hit(key)
    if (res.statusCode === 200) failedLoginsPerEmail.reset(key)
  }
}
