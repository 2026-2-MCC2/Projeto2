import { FRONT_URL, USER_PROFILES, USER_STATUSES } from '../constants.js'
import { AdminUserDTO } from '../dtos/admin_user_dto.js'
import { ForbiddenProfile, InvalidParameter, NotFoundUser, UserStatusConflict } from '../errors/index.js'
import { UserRepository } from '../repositories/user_repository.js'
import { EmailTemplates } from '../utils/email_templates.js'
import { BaseController } from './base_controller.js'

export class AdminUserController extends BaseController {
  constructor(context) {
    super(context, 'AdminUserController')
    this.userRepository = new UserRepository(context)
  }

  async getRegistrationList(limit, offset, status) {
    if (status !== undefined && !Object.values(USER_STATUSES).includes(status)) {
      throw new InvalidParameter(`The "status" parameter is invalid. Status ${status} does not exist.`)
    }

    let users = await this.userRepository.getRegistrationList(limit, offset, status)

    let isLastPage = true
    if (users.length > limit) {
      isLastPage = false
      users = users.slice(0, -1)
    }

    return { usersListDto: AdminUserDTO.registrationList(users), isLastPage: isLastPage }
  }

  // reason é obrigatório ao rejeitar e ao bloquear (validado no schema)
  async changeStatus(userKey, newStatus, reason) {
    const user = await this.userRepository.getByKeyForUpdate(userKey)

    if (user === null) {
      throw new NotFoundUser(userKey)
    }

    const isManageableProfile = [USER_PROFILES.ORGANIZER, USER_PROFILES.SUPPLIER].includes(user.profile)
    const isAllowedTransition = ALLOWED_TRANSITIONS[user.status]?.includes(newStatus) ?? false
    if (!isManageableProfile || !isAllowedTransition) {
      throw new UserStatusConflict(user.status, newStatus)
    }

    const oldStatus = user.status
    const cleanReason = reason?.trim() || null
    const updatedUser = await this.userRepository.updateStatus(user, newStatus, cleanReason)
    if (updatedUser === null) {
      throw new ForbiddenProfile()
    }

    const userDto = AdminUserDTO.statusUpdate(updatedUser)
    await this.session.commit()

    return { userDto, email: statusChangeEmail(updatedUser, oldStatus, cleanReason) }
  }
}

const ALLOWED_TRANSITIONS = {
  [USER_STATUSES.PENDING]: [USER_STATUSES.APPROVED, USER_STATUSES.REJECTED],
  [USER_STATUSES.APPROVED]: [USER_STATUSES.BLOCKED],
  [USER_STATUSES.BLOCKED]: [USER_STATUSES.APPROVED],
}

function statusChangeTemplate(oldStatus, newStatus) {
  if (newStatus === USER_STATUSES.REJECTED) return 'registration_rejected'
  if (newStatus === USER_STATUSES.BLOCKED) return 'account_blocked'
  return oldStatus === USER_STATUSES.BLOCKED ? 'account_reactivated' : 'registration_approved'
}

function statusChangeEmail(user, oldStatus, reason) {
  const content = EmailTemplates.render(statusChangeTemplate(oldStatus, user.status), {
    nome: user.name,
    motivo: reason,
    // a raiz do site é a landing; o e-mail leva direto para o login
    link: `${FRONT_URL}/entrar`,
  })
  return { to: user.email, ...content }
}
