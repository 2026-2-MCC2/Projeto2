// Junta os middlewares. A ordem em que rodam é a da lista no app.js.
//
// MIDDLEWARE
// É uma etapa pela qual toda requisição passa antes de chegar no resource, como os balcões de um
// aeroporto: check-in, raio-x, embarque. Cada middleware é uma classe com até dois métodos:
//   processRequest(req, res)   roda quando a requisição chega. Pode barrar a requisição com um
//                              throw (ex.: sem login -> 401) ou já responder (ex.: preflight do CORS)
//   processResponse(req, res)  roda quando a resposta já foi enviada (ex.: para logar)
//
// Exemplo de um middleware que loga quanto tempo cada requisição levou:
//   export class TimingMiddleware {
//     processRequest(req, res) {
//       req.startedAt = Date.now()
//     }
//
//     processResponse(req, res) {
//       console.log(req.method, req.path, Date.now() - req.startedAt, 'ms')
//     }
//   }
// E no app.js, acrescente new TimingMiddleware() na lista do useMiddlewares.

export { ContextCreator } from './context_creator.js'
export { CorsMiddleware } from './cors.js'
export { InputOutputMiddleware } from './input_output.js'
export { SecureHeaders } from './secure_headers.js'
export { SessionManager } from './session_manager.js'
export { UserAuthenticationMiddleware } from './user_authentication.js'
