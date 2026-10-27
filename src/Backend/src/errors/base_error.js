// Erros da API. Todo erro que a API devolve tem este formato:
//   { "title": "Unauthorized", "description": "A valid login token is required.", "translation": "Sua sessão expirou ou você não está logado. Faça login novamente.", "code": "APP000401" }
//
// Para devolver um erro, basta dar throw em qualquer lugar (resource, controller, repository...):
//   throw new NotFoundResource()
// O throw interrompe o código na hora. O APIErrorHandler (api_error_handler.js) pega o erro e
// responde com o status HTTP dele.
//
// Status HTTP de erro usados:
//   400 Bad Request          o que foi enviado está errado (campo faltando, JSON mal formado)
//   401 Unauthorized         não está logado (token ausente, inválido ou vencido)
//   403 Forbidden            está logado, mas o perfil não tem permissão (ex.: fornecedor criando evento)
//   404 Not Found            a rota ou o registro não existe
//   405 Method Not Allowed   a rota existe, mas não aceita esse método (ex.: DELETE)
//   409 Conflict             o pedido conflita com o estado atual (ex.: status que não pode mudar)
//   500 Internal Error       bug na API; o detalhe vai para o log, não para quem chamou
//
// O "code" (ex.: APP000404) identifica exatamente qual erro foi, para quem chama a API poder tratar.
// Aqui ficam os erros genéricos (prefixo APP). Erros de regra de negócio ficam em custom_errors.js.

export class ApiException extends Error {
  constructor(title, code, httpStatus, description, translation) {
    super(description)
    this.title = title
    this.code = code
    this.httpStatus = httpStatus
    this.description = description
    // a tradução é a mensagem em português, pronta para o front-end mostrar ao usuário
    this.translation = translation
  }

  // é o que vira o body da resposta quando o erro é enviado com res.json()
  toJSON() {
    return {
      title: this.title,
      description: this.description,
      translation: this.translation,
      code: this.code,
    }
  }
}

export class MethodNotAllowed extends ApiException {
  static code = 'APP000405'

  constructor() {
    const title = 'Method not allowed'
    const httpStatus = 405
    const description = 'The requested method is forbidden for this resource.'
    const translation = 'O método desejado não foi encontrado para esse recurso.'
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
    const translation =
      'O resource solicitado não pode ser encontrado, mas pode estar disponível no futuro. Requests subsequentes do cliente são permitidos.'
    super(title, NotFoundResource.code, httpStatus, description, translation)
  }
}

// body inválido: não segue o JSON Schema ou é um JSON mal formado
export class InvalidSchema extends ApiException {
  static code = 'APP000001'

  constructor(description) {
    const title = 'Bad Request'
    const httpStatus = 400
    const translation = 'Payload Inválido'
    super(title, InvalidSchema.code, httpStatus, description, translation)
  }
}

// Não está logado: o header "Authorization: Bearer <token>" não veio, ou o token é inválido ou venceu.
// O front-end deve mandar o usuário para a tela de login.
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

// Está logado, mas o perfil não pode usar esta rota (ex.: um fornecedor tentando criar evento).
// Lançado pelo SecurityTools.requireProfile.
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

// parâmetro da query string inválido (ex.: ?limit=abc)
export class InvalidParameter extends ApiException {
  static code = 'APP000010'

  constructor(description) {
    const title = 'Invalid Parameter'
    const httpStatus = 400
    const translation = 'Parâmetros inválidos foram fornecidos na requisição.'
    super(title, InvalidParameter.code, httpStatus, description, translation)
  }
}
