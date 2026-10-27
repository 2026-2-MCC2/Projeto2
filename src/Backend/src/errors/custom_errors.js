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
