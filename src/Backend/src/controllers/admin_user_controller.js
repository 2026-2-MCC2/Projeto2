// Controller: lista os cadastros e decide o status de um organizador ou fornecedor.

import { USER_PROFILES, USER_STATUSES } from '../constants.js'
import { AdminUserDTO } from '../dtos/admin_user_dto.js'
import { ForbiddenProfile, InvalidParameter, NotFoundUser, UserStatusConflict } from '../errors/index.js'
import { UserRepository } from '../repositories/user_repository.js'
import { BaseController } from './base_controller.js'

export class AdminUserController extends BaseController {
  constructor(context) {
    super(context, 'AdminUserController')
    this.userRepository = new UserRepository(context)
  }

  // Lista do painel de aprovações. status é opcional; quando vem, precisa ser um status de usuário.
  async getRegistrationList(limit, offset, status) {
    if (status !== undefined && !Object.values(USER_STATUSES).includes(status)) {
      throw new InvalidParameter(`The "status" parameter is invalid. Status ${status} does not exist.`)
    }

    let users = await this.userRepository.getRegistrationList(limit, offset, status)

    // o repository busca um item a mais: se ele veio, existe próxima página
    let isLastPage = true
    if (users.length > limit) {
      isLastPage = false
      users = users.slice(0, -1)
    }

    return { usersListDto: AdminUserDTO.registrationList(users), isLastPage: isLastPage }
  }

  async decideStatus(userKey, newStatus) {
    const user = await this.userRepository.getByKeyForUpdate(userKey)

    if (user === null) {
      throw new NotFoundUser(userKey)
    }

    const isDecidableProfile = [USER_PROFILES.ORGANIZER, USER_PROFILES.SUPPLIER].includes(user.profile)
    if (!isDecidableProfile || user.status !== 'pending') {
      throw new UserStatusConflict(user.status, newStatus)
    }

    const updatedUser = await this.userRepository.updateStatus(user, newStatus)
    if (updatedUser === null) {
      throw new ForbiddenProfile()
    }

    const userDto = AdminUserDTO.statusUpdate(updatedUser)
    await this.session.commit()
    return userDto
  }
}
