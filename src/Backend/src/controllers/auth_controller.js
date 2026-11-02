// Controller: autocadastro de organizador (RF01) e login.

import { UniqueConstraintError } from 'sequelize'

import { USER_PROFILES, USER_STATUSES } from '../constants.js'
import { AuthDTO } from '../dtos/auth_dto.js'
import {
  CnpjAlreadyRegistered,
  EmailAlreadyRegistered,
  InvalidCnpj,
  InvalidCredentials,
  InvalidParameter,
  RegistrationPending,
  RegistrationRejected,
} from '../errors/index.js'
import { OrganizerRepository } from '../repositories/organizer_repository.js'
import { UserRepository } from '../repositories/user_repository.js'
import { DocumentTools } from '../utils/documents_tools.js'
import { SecurityTools } from '../utils/security_tools.js'
import { TextTools } from '../utils/text_tools.js'
import { BaseController } from './base_controller.js'

// telefone com DDD: 10 dígitos (fixo) ou 11 dígitos (celular)
const PHONE_PATTERN = /^\d{10,11}$/

// Hash bcrypt de uma senha aleatória que ninguém conhece. Quando o e-mail não existe, o login confere a
// senha contra ele mesmo assim: a resposta demora o mesmo tempo e não revela quais e-mails têm cadastro.
const UNKNOWN_USER_PASSWORD_HASH = '$2b$10$LP/6onjOcbzv40dtTisgWuseA3VsnTAxO8jEmCCbBrYvxV33wjSXu'

export class AuthController extends BaseController {
  constructor(context) {
    super(context, 'AuthController')
    this.userRepository = new UserRepository(context)
    this.organizerRepository = new OrganizerRepository(context)
  }

  async registerOrganizer(payload) {
    const email = TextTools.normalizeEmail(payload.email)
    const cnpj = TextTools.onlyDigits(payload.cnpj)
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
    if ((await this.organizerRepository.getByCnpj(cnpj)) !== null) {
      throw new CnpjAlreadyRegistered()
    }

    const passwordHash = await SecurityTools.hashPassword(payload.password)

    try {
      const user = await this.userRepository.create({
        name: payload.name,
        email: email,
        passwordHash: passwordHash,
        profile: USER_PROFILES.ORGANIZER,
      })
      await this.organizerRepository.create({ userId: user.id, cnpj: cnpj, phone: phone })

      const userDto = AuthDTO.registration(user)
      await this.session.commit()
      return userDto
    } catch (error) {
      throw toDuplicatedRegistrationError(error)
    }
  }

  // Só consulta o banco: não grava nada, então não há commit.
  async login(payload) {
    const user = await this.userRepository.getByEmail(TextTools.normalizeEmail(payload.email))

    const passwordHash = user?.password_hash ?? UNKNOWN_USER_PASSWORD_HASH
    const isPasswordCorrect = await SecurityTools.checkPassword(payload.password, passwordHash)
    if (user === null || !isPasswordCorrect) {
      throw new InvalidCredentials()
    }

    // o status só é revelado para quem acertou a senha
    if (user.status === USER_STATUSES.PENDING) {
      throw new RegistrationPending()
    }
    if (user.status === USER_STATUSES.REJECTED) {
      throw new RegistrationRejected()
    }

    const token = await SecurityTools.generateUserToken({ userKey: user.user_key, profile: user.profile })
    return AuthDTO.login(user, token)
  }
}

// Duas requisições com o mesmo e-mail ou CNPJ podem passar juntas pelas buscas acima. Nesse caso o
// UNIQUE do banco barra a segunda, e aqui o erro do banco vira o 409 correspondente.
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
