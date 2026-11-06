import { CORS_ALLOWED_ORIGINS } from '../constants.js'

const ALLOWED_METHODS = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
const ALLOWED_HEADERS = 'Content-Type, Authorization, GlobalTraceId'
// por quantos segundos o navegador pode guardar a resposta do preflight sem perguntar de novo
const PREFLIGHT_CACHE_SECONDS = '600'

export class CorsMiddleware {
  processRequest(req, res) {
    const origin = req.get('Origin')
    const isAllowedOrigin = origin !== undefined && CORS_ALLOWED_ORIGINS.includes(origin)

    if (isAllowedOrigin) {
      res.set({
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': ALLOWED_METHODS,
        'Access-Control-Allow-Headers': ALLOWED_HEADERS,
        'Access-Control-Max-Age': PREFLIGHT_CACHE_SECONDS,
        // a resposta muda conforme o Origin; avisa caches para não misturar respostas de sites diferentes
        Vary: 'Origin',
      })
    }

    // preflight: a resposta já enviada encerra a requisição aqui (ver useMiddlewares)
    if (req.method === 'OPTIONS') {
      res.status(204).end()
    }
  }
}
