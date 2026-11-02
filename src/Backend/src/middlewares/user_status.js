// o token pode ter sido emitido antes de a conta ser bloqueada, mudar de perfil ou trocar a senha, por isso confere no banco

import { ForbiddenProfile, Unauthorized } from '../errors/index.js'
import { UserRepository } from '../repositories/user_repository.js'

export class UserStatusMiddleware {
  async processRequest(req) {
    // rotas públicas e OPTIONS
    if (req.context.user === null) {
      return
    }

    const user = await new UserRepository(req.context).getByKey(req.context.user.userKey)
    if (user === null || user.status !== 'approved' || user.profile !== req.context.user.profile) {
      throw new ForbiddenProfile()
    }

    if (wasIssuedBeforePasswordChange(req.context.user.issuedAt, user.password_changed_at)) {
      throw new Unauthorized()
    }
  }
}

// trocar a senha encerra os logins abertos antes da troca; o iat do JWT vem em segundos
function wasIssuedBeforePasswordChange(issuedAt, passwordChangedAt) {
  if (passwordChangedAt === null) return false
  return issuedAt < Math.floor(passwordChangedAt.getTime() / 1000)
}
