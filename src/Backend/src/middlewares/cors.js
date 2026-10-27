// Middleware: libera o front-end para chamar a API pelo navegador (CORS).
//
// O QUE É CORS
// Por segurança, o navegador bloqueia uma página de um endereço (ex.: http://localhost:5173) de ler
// a resposta de uma API em outro endereço (ex.: http://localhost:3300). Para liberar, a API precisa
// responder com o header "Access-Control-Allow-Origin" dizendo quais sites podem chamá-la.
// Os sites liberados ficam na variável CORS_ALLOWED_ORIGINS (ver constants.js e local.env).
//
// PREFLIGHT (requisição OPTIONS)
// Antes de um POST/PUT/PATCH/DELETE com JSON ou com o header Authorization, o navegador manda
// sozinho uma requisição OPTIONS perguntando "posso?". Respondemos aqui mesmo com 204 e os headers
// de permissão, e a requisição OPTIONS não segue para as rotas.
//
// Requisições de fora do navegador (curl, Postman, testes) não usam CORS, por isso funcionam sem isso.

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

    // Preflight: responde na hora. Como a resposta já foi enviada, a requisição para aqui
    // (ver useMiddlewares em utils/routing.js).
    if (req.method === 'OPTIONS') {
      res.status(204).end()
    }
  }
}
