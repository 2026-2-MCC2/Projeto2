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

export class NotFoundEvent extends ApiException {
  static code = 'EVP000013'

  constructor(eventKey = '') {
    const title = 'Event not Found'
    const httpStatus = 404
    const description = `Event ${eventKey} was not found.`
    const translation = 'O evento não foi encontrado.'
    super(title, NotFoundEvent.code, httpStatus, description, translation)
  }
}

export class EventEndDateBeforeStartDate extends ApiException {
  static code = 'EVP000014'

  constructor() {
    const title = 'Event end date before start date'
    const httpStatus = 400
    const description = 'Event end date cannot be earlier than start date.'
    const translation = 'A data de término do evento não pode ser anterior à data de início.'
    super(title, EventEndDateBeforeStartDate.code, httpStatus, description, translation)
  }
}

export class EventMinAudienceInvalid extends ApiException {
  static code = 'EVP000015'

  constructor() {
    const title = 'Invalid minimum audience'
    const httpStatus = 400
    const description = 'Minimum audience must be an integer greater than zero.'
    const translation = 'O público mínimo do evento deve ser um número inteiro maior que zero.'
    super(title, EventMinAudienceInvalid.code, httpStatus, description, translation)
  }
}

export class EventExpectedAudienceLessThanMin extends ApiException {
  static code = 'EVP000016'

  constructor() {
    const title = 'Expected audience less than minimum'
    const httpStatus = 400
    const description = 'Expected audience cannot be less than minimum audience.'
    const translation = 'O público esperado não pode ser menor que o público mínimo informado.'
    super(title, EventExpectedAudienceLessThanMin.code, httpStatus, description, translation)
  }
}

export class EventMaxAudienceLessThanExpected extends ApiException {
  static code = 'EVP000017'

  constructor() {
    const title = 'Maximum audience less than expected'
    const httpStatus = 400
    const description = 'Maximum audience cannot be less than expected audience.'
    const translation = 'O público máximo não pode ser menor que o público esperado informado.'
    super(title, EventMaxAudienceLessThanExpected.code, httpStatus, description, translation)
  }
}

export class EventCapacityLessThanMaxAudience extends ApiException {
  static code = 'EVP000018'

  constructor() {
    const title = 'Venue capacity less than maximum audience'
    const httpStatus = 400
    const description = 'Venue capacity cannot be less than maximum audience.'
    const translation = 'A capacidade do espaço não pode ser menor que o público máximo do evento.'
    super(title, EventCapacityLessThanMaxAudience.code, httpStatus, description, translation)
  }
}

export class InvalidProfitMargin extends ApiException {
  static code = 'EVP000019'

  constructor() {
    const title = 'Invalid profit margin'
    const httpStatus = 400
    const description = 'Profit margin must be between 0 and 0.9999.'
    const translation = 'A margem de lucro deve ser maior ou igual a zero e menor que 100%.'
    super(title, InvalidProfitMargin.code, httpStatus, description, translation)
  }
}

export class EventCannotBeModified extends ApiException {
  static code = 'EVP000020'

  constructor(status = '') {
    const title = 'Event cannot be modified'
    const httpStatus = 409
    const description = `Events with status "${status}" cannot be modified.`
    const translation = 'Eventos encerrados ou cancelados não podem ser alterados.'
    super(title, EventCannotBeModified.code, httpStatus, description, translation)
  }
}

export class EventCannotBePublished extends ApiException {
  static code = 'EVP000021'

  constructor(currentStatus = '') {
    const title = 'Event cannot be published'
    const httpStatus = 409
    const description = `Events with status "${currentStatus}" cannot be published for quotes.`
    const translation = 'Apenas eventos em rascunho podem ser publicados para cotação.'
    super(title, EventCannotBePublished.code, httpStatus, description, translation)
  }
}

export class NotFoundOrganizer extends ApiException {
  static code = 'EVP000022'

  constructor(userKey = '') {
    const title = 'Organizer profile not found'
    const httpStatus = 404
    const description = `Organizer profile for user ${userKey} was not found.`
    const translation = 'Cadastro de organizador não encontrado para este usuário.'
    super(title, NotFoundOrganizer.code, httpStatus, description, translation)
  }
}

export class NotFoundInternalCost extends ApiException {
  static code = 'EVP000023'

  constructor(costKey = '') {
    const title = 'Internal cost not found'
    const httpStatus = 404
    const description = `Internal cost ${costKey} was not found.`
    const translation = 'O custo interno do evento não foi encontrado.'
    super(title, NotFoundInternalCost.code, httpStatus, description, translation)
  }
}

export class InvalidInternalCostAmount extends ApiException {
  static code = 'EVP000024'

  constructor() {
    const title = 'Invalid internal cost amount'
    const httpStatus = 400
    const description = 'Internal cost amount must be greater than or equal to zero.'
    const translation = 'O valor do custo interno deve ser maior ou igual a zero.'
    super(title, InvalidInternalCostAmount.code, httpStatus, description, translation)
  }
}

export class InvalidInternalCostType extends ApiException {
  static code = 'EVP000025'

  constructor() {
    const title = 'Invalid internal cost type'
    const httpStatus = 400
    const description = 'Internal cost type must be tax, operational, or other.'
    const translation = 'O tipo de custo interno deve ser fiscal (tax), operacional (operational) ou outro (other).'
    super(title, InvalidInternalCostType.code, httpStatus, description, translation)
  }
}

export class EventStatusConflict extends ApiException {
  static code = 'EVP000026'

  constructor(message = 'O status do evento não pode ser alterado.') {
    const title = 'Event status conflict'
    const httpStatus = 409
    const description = 'Cannot perform this action due to current event status.'
    const translation = message
    super(title, EventStatusConflict.code, httpStatus, description, translation)
  }
}

export class EventInvalidDate extends ApiException {
  static code = 'EVP000027'

  constructor() {
    const title = 'Invalid event date'
    const httpStatus = 400
    const description = 'start_date or end_date is not a date that exists in the calendar.'
    const translation = 'Confira as datas do evento: uma delas não existe no calendário.'
    super(title, EventInvalidDate.code, httpStatus, description, translation)
  }
}
