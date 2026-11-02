// Erros de regra de negócio (prefixo EVP = Event Planning API).
//
// COMO CRIAR UM ERRO NOVO
//   export class SampleEntityAlreadyExists extends ApiException {
//     static code = 'EVP000003'   // código único: a aplicação nem sobe se dois erros usarem o mesmo
//
//     constructor(sampleEntityKey) {
//       const title = 'Entity already exists'
//       const httpStatus = 409
//       const description = `Entity with key ${sampleEntityKey} already exists.`
//       const translation = `A entidade com chave ${sampleEntityKey} já existe.`
//       super(title, SampleEntityAlreadyExists.code, httpStatus, description, translation)
//     }
//   }
//
// E para usar, no controller:
//   throw new SampleEntityAlreadyExists(sampleEntityKey)

import { ApiException } from './base_error.js'

export class NotFoundSampleEntity extends ApiException {
  static code = 'EVP000001'

  constructor(sampleEntityKey) {
    const title = 'Entity not Found'
    const httpStatus = 404
    const description = `Entity with key ${sampleEntityKey} was not found.`
    const translation = `A entidade com chave ${sampleEntityKey} não foi encontrada.`
    super(title, NotFoundSampleEntity.code, httpStatus, description, translation)
  }
}

export class SampleEntityFinalStatus extends ApiException {
  static code = 'EVP000002'

  constructor(oldStatus, newStatus) {
    const title = 'Entity cannot change status'
    const httpStatus = 409
    const description = `Entity with status ${oldStatus} cannot update to ${newStatus}.`
    const translation = 'Essa entidade não pode ser atualizada.'
    super(title, SampleEntityFinalStatus.code, httpStatus, description, translation)
  }
}

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
