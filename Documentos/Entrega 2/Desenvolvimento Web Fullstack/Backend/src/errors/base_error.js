export class ApiException extends Error {
  constructor(title, code, httpStatus, description, translation, details = undefined) {
    super(description)
    this.title = title
    this.code = code
    this.httpStatus = httpStatus
    this.description = description
    this.translation = translation
    this.details = details
  }

  toJSON() {
    return {
      title: this.title,
      description: this.description,
      translation: this.translation,
      code: this.code,
      ...(this.details !== undefined && { details: this.details }),
    }
  }
}

export class MethodNotAllowed extends ApiException {
  static code = 'APP000405'

  constructor() {
    const title = 'Method not allowed'
    const httpStatus = 405
    const description = 'The requested method is forbidden for this resource.'
    const translation = 'Esta ação não é permitida neste endereço.'
    super(title, MethodNotAllowed.code, httpStatus, description, translation)
  }
}

export class InternalError extends ApiException {
  static code = 'APP000500'

  constructor() {
    const title = 'Internal Error'
    const httpStatus = 500
    const description = 'An internal error has occurred and its being investigated.'
    const translation = 'Um erro interno aconteceu e está sendo investigado.'
    super(title, InternalError.code, httpStatus, description, translation)
  }
}

export class NotFoundResource extends ApiException {
  static code = 'APP000404'

  constructor() {
    const title = 'Resource not Found'
    const httpStatus = 404
    const description =
      'The requested resource could not be found but may be available in the future. Subsequent requests by the client are permissible.'
    const translation = 'O endereço solicitado não existe.'
    super(title, NotFoundResource.code, httpStatus, description, translation)
  }
}

export class InvalidSchema extends ApiException {
  static code = 'APP000001'

  constructor(description, translation = 'Alguns campos estão inválidos. Confira os dados e tente de novo.') {
    const title = 'Bad Request'
    const httpStatus = 400
    super(title, InvalidSchema.code, httpStatus, description, translation)
  }
}

export class Unauthorized extends ApiException {
  static code = 'APP000401'

  constructor() {
    const title = 'Unauthorized'
    const httpStatus = 401
    const description = 'A valid login token is required.'
    const translation = 'Sua sessão expirou ou você não está logado. Faça login novamente.'
    super(title, Unauthorized.code, httpStatus, description, translation)
  }
}

export class ForbiddenProfile extends ApiException {
  static code = 'APP000403'

  constructor() {
    const title = 'Forbidden'
    const httpStatus = 403
    const description = 'Your profile is not allowed to access this resource.'
    const translation = 'Seu perfil não tem permissão para acessar este recurso.'
    super(title, ForbiddenProfile.code, httpStatus, description, translation)
  }
}

export class InvalidParameter extends ApiException {
  static code = 'APP000010'

  constructor(description) {
    const title = 'Invalid Parameter'
    const httpStatus = 400
    const translation = 'Parâmetros inválidos foram fornecidos na requisição.'
    super(title, InvalidParameter.code, httpStatus, description, translation)
  }
}

export class PayloadTooLarge extends ApiException {
  static code = 'APP000413'

  constructor(maxKilobytes) {
    const title = 'Payload Too Large'
    const httpStatus = 413
    const description = `The request body must have at most ${maxKilobytes} KB.`
    const translation = 'Os dados enviados são grandes demais.'
    super(title, PayloadTooLarge.code, httpStatus, description, translation)
  }
}
