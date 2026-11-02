// Controller: decide o status de cadastro de um organizador ou fornecedor.

import { USER_PROFILES } from '../constants.js'
import { AdminUserDTO } from '../dtos/admin_user_dto.js'
import { ForbiddenProfile, NotFoundUser, UserStatusConflict } from '../errors/index.js'
import { UserRepository } from '../repositories/user_repository.js'
import { BaseController } from './base_controller.js'

export class AdminUserController extends BaseController {
  constructor(context) {
    super(context, 'AdminUserController')
    this.userRepository = new UserRepository(context)
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
