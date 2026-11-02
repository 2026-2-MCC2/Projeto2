import { ApiException } from './base_error.js'

export class NotFoundUser extends ApiException {
  static code = 'EVP000003'

  constructor(userKey) {
    const title = 'User not Found'
    const httpStatus = 404
    const description = `User with key ${userKey} was not found.`
    const translation = `O usuário com chave ${userKey} não foi encontrado.`
    super(title, NotFoundUser.code, httpStatus, description, translation)
  }
}

export class UserStatusConflict extends ApiException {
  static code = 'EVP000004'

  constructor(oldStatus, newStatus) {
    const title = 'User status cannot change'
    const httpStatus = 409
    const description = `User with status ${oldStatus} cannot update to ${newStatus}.`
    const translation = 'Esse usuário não pode ter o status alterado.'
    super(title, UserStatusConflict.code, httpStatus, description, translation)
  }
}

export class EmailAlreadyRegistered extends ApiException {
  static code = 'EVP000005'

  constructor() {
    const title = 'Email already registered'
    const httpStatus = 409
    const description = 'A registration with this email already exists.'
    const translation = 'Já existe um cadastro com este e-mail.'
    super(title, EmailAlreadyRegistered.code, httpStatus, description, translation)
  }
}

export class CnpjAlreadyRegistered extends ApiException {
  static code = 'EVP000006'

  constructor() {
    const title = 'CNPJ already registered'
    const httpStatus = 409
    const description = 'A registration with this CNPJ already exists.'
    const translation = 'Já existe um cadastro com este CNPJ.'
    super(title, CnpjAlreadyRegistered.code, httpStatus, description, translation)
  }
}

export class InvalidCnpj extends ApiException {
  static code = 'EVP000007'

  constructor() {
    const title = 'Invalid CNPJ'
    const httpStatus = 400
    const description = 'The informed CNPJ is not valid.'
    const translation = 'Informe um CNPJ válido.'
    super(title, InvalidCnpj.code, httpStatus, description, translation)
  }
}

// mesmo erro para e-mail inexistente e senha errada, para não revelar quais e-mails têm cadastro
export class InvalidCredentials extends ApiException {
  static code = 'EVP000008'

  constructor() {
    const title = 'Invalid credentials'
    const httpStatus = 401
    const description = 'Email or password is incorrect.'
    const translation = 'E-mail ou senha incorretos.'
    super(title, InvalidCredentials.code, httpStatus, description, translation)
  }
}

export class RegistrationPending extends ApiException {
  static code = 'EVP000009'

  // details: resumo do cadastro (AuthDTO.registrationStatus), mostrado só a quem acertou a senha
  constructor(details) {
    const title = 'Registration pending'
    const httpStatus = 403
    const description = 'The registration is still waiting for the administrator approval.'
    const translation = 'Seu cadastro ainda está em análise.'
    super(title, RegistrationPending.code, httpStatus, description, translation, details)
  }
}

export class RegistrationRejected extends ApiException {
  static code = 'EVP000010'

  // details: resumo do cadastro (AuthDTO.registrationStatus), mostrado só a quem acertou a senha
  constructor(details) {
    const title = 'Registration rejected'
    const httpStatus = 403
    const description = 'The registration was rejected by the administrator.'
    const translation = 'Seu cadastro não foi aprovado.'
    super(title, RegistrationRejected.code, httpStatus, description, translation, details)
  }
}

export class AccountBlocked extends ApiException {
  static code = 'EVP000011'

  constructor() {
    const title = 'Account blocked'
    const httpStatus = 403
    const description = 'The account was blocked by the administrator.'
    const translation = 'Seu acesso foi bloqueado. Fale com o administrador da plataforma.'
    super(title, AccountBlocked.code, httpStatus, description, translation)
  }
}

export class InvalidPasswordResetToken extends ApiException {
  static code = 'EVP000012'

  constructor() {
    const title = 'Invalid password reset link'
    const httpStatus = 400
    const description = 'The password reset link is invalid, expired or already used.'
    const translation = 'Este link de redefinição é inválido ou já venceu. Peça um novo em "Esqueceu sua senha?".'
    super(title, InvalidPasswordResetToken.code, httpStatus, description, translation)
  }
}
