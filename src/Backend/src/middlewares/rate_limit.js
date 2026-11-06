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
// por IP e e-mail, não só por e-mail: senão qualquer um bloquearia o login do dono da conta errando a senha dele
const failedLoginsPerEmail = new RateLimiter({
  maxHits: RATE_LIMIT_MAX_FAILED_LOGINS_PER_EMAIL,
  windowSeconds: RATE_LIMIT_WINDOW_SECONDS,
})

// o Express aceita a rota com maiúsculas e com barra no fim; todas as grafias contam juntas
function normalizePath(path) {
  return path.toLowerCase().replace(/\/+$/, '')
}

// o MySQL acha a conta ignorando acentos (collation utf8mb4_0900_ai_ci): "vítima@x.com" e "vitima@x.com"
// são a mesma linha, então a chave também tira os acentos, para cada grafia não ganhar a própria cota
function loginKey(req) {
  const email = req.context.media?.email
  if (typeof email !== 'string') return null
  const withoutAccents = TextTools.normalizeEmail(email).normalize('NFKD').replace(/\p{M}/gu, '')
  return `${req.ip} ${withoutAccents}`
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

    // a tentativa conta já na chegada, antes do bcrypt: senão vários pedidos juntos passariam todos
    // pela conferência antes de o primeiro erro ser contado. Na resposta, só a senha errada fica
    if (path === LOGIN_PATH) {
      const key = loginKey(req)
      if (key !== null) {
        throwIfBlocked(res, failedLoginsPerEmail, key)
        failedLoginsPerEmail.hit(key)
        res.locals.countedLoginKey = key
      }
    }
  }

  processResponse(req, res) {
    // cliente que desconecta antes da resposta não tem resultado (e o statusCode ainda vale o 200
    // padrão): a tentativa continua contada, senão desconectar zeraria a contagem
    const key = res.locals.countedLoginKey
    if (key === undefined || !res.headersSent) return

    if (res.statusCode === 200) failedLoginsPerEmail.reset(key)
    else if (res.statusCode !== 401) failedLoginsPerEmail.undo(key)
  }
}
