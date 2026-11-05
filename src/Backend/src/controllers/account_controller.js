import { USER_PROFILES } from '../constants.js'
import { AuthDTO } from '../dtos/auth_dto.js'
import { CurrentPasswordIncorrect, ForbiddenProfile, InvalidSchema } from '../errors/index.js'
import { SupplierRepository } from '../repositories/supplier_repository.js'
import { UserRepository } from '../repositories/user_repository.js'
import { SecurityTools } from '../utils/security_tools.js'
import { TextTools } from '../utils/text_tools.js'
import { BaseController } from './base_controller.js'

// telefone com DDD: 10 dígitos (fixo) ou 11 dígitos (celular)
const PHONE_PATTERN = /^\d{10,11}$/

const blankToNull = (text) => text?.trim() || null

// a conta de quem está logado: dados da empresa, categorias do fornecedor e senha
export class AccountController extends BaseController {
  constructor(context) {
    super(context, 'AccountController')
    this.userRepository = new UserRepository(context)
    this.supplierRepository = new SupplierRepository(context)
  }

  async updateProfile(userKey, payload) {
    const user = await this.userRepository.getProfileByKey(userKey)
    const company = user.organizer ?? user.supplier

    if (payload.name !== undefined) {
      user.name = payload.name.trim()
    }
    // o admin não tem empresa: só o nome muda
    if (company) {
      this.#applyCompanyChanges(company, payload)
      await company.save({ transaction: this.session })
    }
    await user.save({ transaction: this.session })

    return this.#commitAndGetCurrentUser(userKey)
  }

  #applyCompanyChanges(company, payload) {
    if (payload.phone !== undefined) {
      const phone = TextTools.onlyDigits(payload.phone)
      if (!PHONE_PATTERN.test(phone)) {
        throw new InvalidSchema(
          'The phone must have 10 or 11 digits, including the area code.',
          'Informe o telefone com DDD: 10 ou 11 dígitos.',
        )
      }
      company.phone = phone
    }
    if (payload.responsible_name !== undefined) company.responsible_name = blankToNull(payload.responsible_name)
    if (payload.city !== undefined) company.city = blankToNull(payload.city)
    if (payload.state !== undefined) company.state = blankToNull(payload.state)?.toUpperCase() ?? null
  }

  async updateSupplierCategories(userKey, categories) {
    const user = await this.userRepository.getProfileByKey(userKey)
    if (user.profile !== USER_PROFILES.SUPPLIER) {
      throw new ForbiddenProfile()
    }

    await this.supplierRepository.replaceCategories(user.supplier.id, categories)
    return this.#commitAndGetCurrentUser(userKey)
  }

  // trocar a senha encerra os outros logins; quem trocou recebe um token novo para continuar
  async changePassword(userKey, { current_password: currentPassword, new_password: newPassword }) {
    const user = await this.userRepository.getByKey(userKey)
    if (!(await SecurityTools.checkPassword(currentPassword, user.password_hash))) {
      throw new CurrentPasswordIncorrect()
    }

    user.password_hash = await SecurityTools.hashPassword(newPassword)
    user.password_changed_at = new Date()
    await user.save({ transaction: this.session })
    await this.session.commit()

    const token = await SecurityTools.generateUserToken({ userKey: user.user_key, profile: user.profile })
    return { token }
  }

  async #commitAndGetCurrentUser(userKey) {
    const userDto = AuthDTO.currentUser(await this.userRepository.getProfileByKey(userKey))
    await this.session.commit()
    return userDto
  }
}
