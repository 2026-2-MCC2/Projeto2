// Confere no banco se a conta associada ao token continua aprovada e com o mesmo perfil.
// Roda depois da autenticação e da abertura da transação, antes de qualquer rota protegida.

import { ForbiddenProfile } from '../errors/index.js'
import { UserRepository } from '../repositories/user_repository.js'

export class UserStatusMiddleware {
  async processRequest(req) {
    // Rotas públicas e OPTIONS não têm usuário autenticado.
    if (req.context.user === null) {
      return
    }

    const user = await new UserRepository(req.context).getByKey(req.context.user.userKey)
    if (user === null || user.status !== 'approved' || user.profile !== req.context.user.profile) {
      throw new ForbiddenProfile()
    }
  }
}
