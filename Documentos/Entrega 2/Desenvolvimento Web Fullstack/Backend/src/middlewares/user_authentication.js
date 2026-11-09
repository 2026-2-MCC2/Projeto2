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
