// Middleware: confere se quem está chamando a API está logado.
//
// O front-end manda o token recebido no login em toda requisição, neste header:
//   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
//
// Se o token for válido, o usuário logado fica disponível para o resto da requisição:
//   req.context.user.userKey   chave pública (UUID) do usuário
//   req.context.user.profile   'admin' | 'organizador' | 'fornecedor' (ver USER_PROFILES em constants.js)
// Sem token, com token inválido ou vencido: responde 401 (code APP000401).
//
// As rotas listadas em PUBLIC_ENDPOINTS (constants.js) não exigem login: login, autocadastro,
// home e health check. Todas as outras exigem.
//
// Este middleware só confere SE o usuário está logado. QUAL perfil pode usar cada rota é decidido
// no resource, com SecurityTools.requireProfile (ver utils/security_tools.js).

import { PUBLIC_ENDPOINTS } from '../constants.js'
import { Unauthorized } from '../errors/index.js'
import { SecurityTools } from '../utils/security_tools.js'

export class UserAuthenticationMiddleware {
  async processRequest(req, res) {
    if (req.method === 'OPTIONS' || PUBLIC_ENDPOINTS.includes(req.path)) {
      return
    }

    const token = getBearerToken(req)
    if (token === null) {
      throw new Unauthorized()
    }

    req.context.user = await SecurityTools.readUserToken(token)
  }
}

// Tira o token do header "Authorization: Bearer <token>". Devolve null se o header não veio
// ou não está nesse formato.
function getBearerToken(req) {
  const authorizationHeader = req.get('Authorization')
  if (authorizationHeader === undefined) {
    return null
  }

  const [type, token] = authorizationHeader.split(' ')
  if (type !== 'Bearer' || !token) {
    return null
  }

  return token
}
