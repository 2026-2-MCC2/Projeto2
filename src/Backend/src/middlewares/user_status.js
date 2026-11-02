// o token pode ter sido emitido antes de a conta ser bloqueada ou mudar de perfil, por isso confere no banco

import { ForbiddenProfile } from '../errors/index.js'
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
  }
}
