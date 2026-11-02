// Controller: autocadastro de organizador (RF01).

import { UniqueConstraintError } from 'sequelize'

import { USER_PROFILES } from '../constants.js'
import { AuthDTO } from '../dtos/auth_dto.js'
import { CnpjAlreadyRegistered, EmailAlreadyRegistered, InvalidCnpj, InvalidParameter } from '../errors/index.js'
import { OrganizerRepository } from '../repositories/organizer_repository.js'
import { UserRepository } from '../repositories/user_repository.js'
import { DocumentTools } from '../utils/documents_tools.js'
import { SecurityTools } from '../utils/security_tools.js'
import { BaseController } from './base_controller.js'

// telefone com DDD: 10 dígitos (fixo) ou 11 dígitos (celular)
const PHONE_PATTERN = /^\d{10,11}$/

export class AuthController extends BaseController {
  constructor(context) {
    super(context, 'AuthController')
    this.userRepository = new UserRepository(context)
    this.organizerRepository = new OrganizerRepository(context)
  }

  async registerOrganizer(payload) {
    const email = payload.email.trim().toLowerCase()
    const cnpj = onlyDigits(payload.cnpj)
    const phone = onlyDigits(payload.phone)

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
}

function onlyDigits(value) {
  return String(value).replace(/\D/g, '')
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
