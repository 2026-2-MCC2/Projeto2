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

  // details: resumo do cadastro com o motivo do bloqueio, mostrado só a quem acertou a senha
  constructor(details) {
    const title = 'Account blocked'
    const httpStatus = 403
    const description = 'The account was blocked by the administrator.'
    const translation = 'Seu acesso foi bloqueado. Fale com o administrador da plataforma.'
    super(title, AccountBlocked.code, httpStatus, description, translation, details)
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

export class NotFoundBudgetItem extends ApiException {
  static code = 'EVP000028'

  constructor(itemKey = '') {
    const title = 'Budget item not Found'
    const httpStatus = 404
    const description = `Budget item ${itemKey} was not found.`
    const translation = 'O item de custo não foi encontrado.'
    super(title, NotFoundBudgetItem.code, httpStatus, description, translation)
  }
}

export class BudgetItemLocked extends ApiException {
  static code = 'EVP000029'

  constructor(itemKey = '') {
    const title = 'Budget item is locked'
    const httpStatus = 409
    const description = `Budget item ${itemKey} cannot be changed because it already has proposals.`
    const translation = 'O item de custo não pode ser alterado ou removido porque já recebeu propostas.'
    super(title, BudgetItemLocked.code, httpStatus, description, translation)
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
    const translation = 'Este custo próprio não foi encontrado no evento.'
    super(title, NotFoundInternalCost.code, httpStatus, description, translation)
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

export class EventNotOpenForQuotes extends ApiException {
  static code = 'EVP000030'

  constructor() {
    const title = 'Event is not open for quotes'
    const httpStatus = 409
    const description = 'Proposals can only be accepted while the event is open for quotes.'
    const translation = 'Só é possível aceitar propostas enquanto o evento está em cotação.'
    super(title, EventNotOpenForQuotes.code, httpStatus, description, translation)
  }
}

export class NotFoundProposal extends ApiException {
  static code = 'EVP000033'

  constructor(proposalKey = '') {
    const title = 'Proposal not found'
    const httpStatus = 404
    const description = `Proposal ${proposalKey} was not found in this event.`
    const translation = 'A proposta não foi encontrada neste evento.'
    super(title, NotFoundProposal.code, httpStatus, description, translation)
  }
}

export class ProposalExpired extends ApiException {
  static code = 'EVP000034'

  constructor() {
    const title = 'Proposal expired'
    const httpStatus = 409
    const description = 'An expired proposal cannot be accepted.'
    const translation = 'Esta proposta está vencida e não pode ser aceita.'
    super(title, ProposalExpired.code, httpStatus, description, translation)
  }
}

export class ProposalDecisionConflict extends ApiException {
  static code = 'EVP000035'

  constructor() {
    const title = 'Proposal was decided concurrently'
    const httpStatus = 409
    const description = 'Another proposal for this item was accepted while this request was waiting.'
    const translation = 'Outra proposta deste item foi aceita ao mesmo tempo. Atualize a tela e tente novamente.'
    super(title, ProposalDecisionConflict.code, httpStatus, description, translation)
  }
}

export class CurrentPasswordIncorrect extends ApiException {
  static code = 'EVP000037'

  constructor() {
    const title = 'Current password is incorrect'
    const httpStatus = 400
    const description = 'The current password does not match.'
    const translation = 'A senha atual não confere.'
    super(title, CurrentPasswordIncorrect.code, httpStatus, description, translation)
  }
}

export class ProposalAlreadySent extends ApiException {
  static code = 'EVP000038'

  constructor() {
    const title = 'Proposal already sent'
    const httpStatus = 409
    const description = 'The supplier already sent a proposal for this budget item.'
    const translation = 'Você já enviou uma proposta para este item.'
    super(title, ProposalAlreadySent.code, httpStatus, description, translation)
  }
}

export class ProposalValidUntilInPast extends ApiException {
  static code = 'EVP000039'

  constructor() {
    const title = 'Proposal validity in the past'
    const httpStatus = 400
    const description = 'valid_until must be today or a later date.'
    const translation = 'A validade da proposta precisa ser a partir de hoje.'
    super(title, ProposalValidUntilInPast.code, httpStatus, description, translation)
  }
}

export class ProposalValidUntilAfterEvent extends ApiException {
  static code = 'EVP000040'

  constructor() {
    const title = 'Proposal validity after the event'
    const httpStatus = 400
    const description = 'valid_until cannot be later than the event end date.'
    const translation = 'A validade da proposta não pode passar da data de término do evento.'
    super(title, ProposalValidUntilAfterEvent.code, httpStatus, description, translation)
  }
}

export class ProposalCannotBeChanged extends ApiException {
  static code = 'EVP000041'

  constructor(status = '') {
    const title = 'Proposal cannot be changed'
    const httpStatus = 409
    const description = `A proposal with status ${status} can no longer be edited or withdrawn.`
    const translation = 'Esta proposta já foi analisada pelo organizador e não pode mais ser alterada nem retirada.'
    super(title, ProposalCannotBeChanged.code, httpStatus, description, translation)
  }
}

export class ProposalEventNotOpen extends ApiException {
  static code = 'EVP000042'

  constructor() {
    const title = 'Event is not open for quotes'
    const httpStatus = 409
    const description = 'Proposals can only be edited or withdrawn while the event is open for quotes.'
    const translation = 'O evento não está mais em cotação: a proposta não pode ser alterada nem retirada.'
    super(title, ProposalEventNotOpen.code, httpStatus, description, translation)
  }
}

export class ProposalPhotoLimitReached extends ApiException {
  static code = 'EVP000043'

  constructor(maxPhotos) {
    const title = 'Proposal photo limit reached'
    const httpStatus = 409
    const description = `A proposal can have at most ${maxPhotos} photos.`
    const translation = `Esta proposta já tem ${maxPhotos} fotos. Retire uma para enviar outra.`
    super(title, ProposalPhotoLimitReached.code, httpStatus, description, translation)
  }
}

export class InvalidProposalPhoto extends ApiException {
  static code = 'EVP000044'

  constructor(description = 'The photo must be a JPG, PNG or WebP image sent in the "photo" field.') {
    const title = 'Invalid proposal photo'
    const httpStatus = 400
    const translation = 'Envie uma foto em JPG, PNG ou WebP.'
    super(title, InvalidProposalPhoto.code, httpStatus, description, translation)
  }
}

export class ProposalPhotoTooLarge extends ApiException {
  static code = 'EVP000045'

  constructor(maxMegabytes) {
    const title = 'Proposal photo too large'
    const httpStatus = 413
    const description = `The photo must have at most ${maxMegabytes} MB.`
    const translation = `A foto pode ter até ${maxMegabytes} MB.`
    super(title, ProposalPhotoTooLarge.code, httpStatus, description, translation)
  }
}

export class NotFoundProposalPhoto extends ApiException {
  static code = 'EVP000046'

  constructor(photoKey = '') {
    const title = 'Proposal photo not Found'
    const httpStatus = 404
    const description = `Photo ${photoKey} was not found in this proposal.`
    const translation = 'A foto não foi encontrada.'
    super(title, NotFoundProposalPhoto.code, httpStatus, description, translation)
  }
}

export class ProposalItemAlreadyDecided extends ApiException {
  static code = 'EVP000047'

  constructor() {
    const title = 'Budget item already has an accepted proposal'
    const httpStatus = 409
    const description = 'The organizer already accepted a proposal for this budget item.'
    const translation = 'O organizador já escolheu uma proposta para este item.'
    super(title, ProposalItemAlreadyDecided.code, httpStatus, description, translation)
  }
}
