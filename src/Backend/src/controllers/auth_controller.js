import { UniqueConstraintError } from 'sequelize'

import { USER_PROFILES, USER_STATUSES } from '../constants.js'
import { AuthDTO } from '../dtos/auth_dto.js'
import {
  AccountBlocked,
  CnpjAlreadyRegistered,
  EmailAlreadyRegistered,
  InvalidCnpj,
  InvalidCredentials,
  InvalidParameter,
  RegistrationPending,
  RegistrationRejected,
} from '../errors/index.js'
import { OrganizerRepository } from '../repositories/organizer_repository.js'
import { SupplierRepository } from '../repositories/supplier_repository.js'
import { UserRepository } from '../repositories/user_repository.js'
import { DocumentTools } from '../utils/documents_tools.js'
import { SecurityTools } from '../utils/security_tools.js'
import { TextTools } from '../utils/text_tools.js'
import { BaseController } from './base_controller.js'

// telefone com DDD: 10 dígitos (fixo) ou 11 dígitos (celular)
const PHONE_PATTERN = /^\d{10,11}$/

// hash de uma senha que ninguém conhece: com e-mail inexistente o login confere a senha mesmo assim,
// para o tempo de resposta não revelar quais e-mails têm cadastro
const UNKNOWN_USER_PASSWORD_HASH = '$2b$10$LP/6onjOcbzv40dtTisgWuseA3VsnTAxO8jEmCCbBrYvxV33wjSXu'

export class AuthController extends BaseController {
  constructor(context) {
    super(context, 'AuthController')
    this.userRepository = new UserRepository(context)
    this.organizerRepository = new OrganizerRepository(context)
    this.supplierRepository = new SupplierRepository(context)
  }

  // RF01 (organizador) e RF02 (fornecedor)
  async register(payload) {
    const profileRegistration = this.getProfileRegistration(payload)

    const email = TextTools.normalizeEmail(payload.email)
    const cnpj = DocumentTools.normalizeCnpj(payload.cnpj)
    const phone = TextTools.onlyDigits(payload.phone)

    if (!DocumentTools.isValidCnpj(cnpj)) {
      throw new InvalidCnpj()
    }
    if (!PHONE_PATTERN.test(phone)) {
      throw new InvalidParameter('The phone must have 10 or 11 digits, including the area code.')
    }

    if ((await this.userRepository.getByEmail(email)) !== null) {
      throw new EmailAlreadyRegistered()
    }
    if (await this.#isCnpjRegistered(cnpj)) {
      throw new CnpjAlreadyRegistered()
    }

    const passwordHash = await SecurityTools.hashPassword(payload.password)

    try {
      const user = await this.userRepository.create({
        name: payload.name.trim(),
        email: email,
        passwordHash: passwordHash,
        profile: profileRegistration.profile,
      })
      await profileRegistration.repository.create({ userId: user.id, cnpj: cnpj, phone: phone, ...profileRegistration.extraData })

      const userDto = AuthDTO.registration(user)
      await this.session.commit()
      return userDto
    } catch (error) {
      throw toDuplicatedRegistrationError(error)
    }
  }

  // a tela de cadastro avisa já na etapa do CNPJ, antes de a pessoa preencher o resto
  async checkCnpjAvailability(rawCnpj) {
    const cnpj = DocumentTools.normalizeCnpj(rawCnpj)
    if (!DocumentTools.isValidCnpj(cnpj)) {
      throw new InvalidCnpj()
    }
    return { available: !(await this.#isCnpjRegistered(cnpj)) }
  }

  // um CNPJ = um cadastro, seja de organizador ou de fornecedor
  async #isCnpjRegistered(cnpj) {
    const organizer = await this.organizerRepository.getByCnpj(cnpj)
    return organizer !== null || (await this.supplierRepository.getByCnpj(cnpj)) !== null
  }

  getProfileRegistration(payload) {
    if (payload.profile === USER_PROFILES.SUPPLIER) {
      return {
        profile: USER_PROFILES.SUPPLIER,
        repository: this.supplierRepository,
        extraData: { categories: payload.categories },
      }
    }
    if (payload.profile === USER_PROFILES.ORGANIZER) {
      return { profile: USER_PROFILES.ORGANIZER, repository: this.organizerRepository, extraData: {} }
    }
    throw new InvalidParameter(`The profile ${payload.profile} cannot self-register.`)
  }

  async getCurrentUser(userKey) {
    const user = await this.userRepository.getProfileByKey(userKey)
    return AuthDTO.currentUser(user)
  }

  async login(payload) {
    const user = await this.userRepository.getByEmail(TextTools.normalizeEmail(payload.email))

    const passwordHash = user?.password_hash ?? UNKNOWN_USER_PASSWORD_HASH
    const isPasswordCorrect = await SecurityTools.checkPassword(payload.password, passwordHash)
    if (user === null || !isPasswordCorrect) {
      throw new InvalidCredentials()
    }

    // o status só é revelado para quem acertou a senha
    if (user.status === USER_STATUSES.PENDING) {
      throw new RegistrationPending(await this.getRegistrationStatus(user))
    }
    if (user.status === USER_STATUSES.REJECTED) {
      throw new RegistrationRejected(await this.getRegistrationStatus(user))
    }
    if (user.status === USER_STATUSES.BLOCKED) {
      throw new AccountBlocked()
    }

    const token = await SecurityTools.generateUserToken({ userKey: user.user_key, profile: user.profile })
    return AuthDTO.login(user, token)
  }

  async getRegistrationStatus(user) {
    const summary = await this.userRepository.getRegistrationSummary(user.id)
    return AuthDTO.registrationStatus(summary)
  }
}

// duas requisições com o mesmo e-mail ou cnpj podem passar juntas pelas buscas; o unique do banco barra a segunda
function toDuplicatedRegistrationError(error) {
  if (!(error instanceof UniqueConstraintError)) {
    return error
  }

  const duplicatedFields = Object.keys(error.fields ?? {})
  if (duplicatedFields.includes('email')) {
    return new EmailAlreadyRegistered()
  }
  if (duplicatedFields.includes('cnpj')) {
    return new CnpjAlreadyRegistered()
  }
  return error
}
