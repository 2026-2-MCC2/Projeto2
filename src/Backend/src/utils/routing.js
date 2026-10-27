// Liga os resources e os middlewares (que são classes) ao Express.
// Você só usa estas funções no app.js; normalmente não precisa mexer aqui.
//
// addRoute(app, url, resource, sufixo)
//   Procura no resource os métodos on + MétodoHTTP + sufixo e registra cada um na URL:
//
//     addRoute(app, '/event_planning/sample_entity', sampleEntityResource)
//       POST   -> sampleEntityResource.onPost(req, res)
//
//     addRoute(app, '/event_planning/sample_entity/:sample_entity_key', sampleEntityResource, 'ByKey')
//       GET    -> sampleEntityResource.onGetByKey(req, res, sampleEntityKey)
//       PUT    -> sampleEntityResource.onPutByKey(req, res, sampleEntityKey)
//
//   As partes variáveis da URL (as que começam com ":") chegam como parâmetros extras, na ordem.
//   Métodos HTTP que o resource não tem respondem 405 (Method Not Allowed).
//
// useMiddlewares(app, [middleware1, middleware2, ...])
//   Para cada middleware, na ordem da lista:
//     processRequest(req, res)   roda quando a requisição chega, antes do resource
//     processResponse(req, res)  roda quando a resposta termina de ser enviada
//   Os dois são opcionais. Se o processRequest der throw, a requisição para ali e vira erro.
//   Se o processRequest já enviar a resposta (ex.: res.status(204).end()), a requisição também para ali.
//
// addSink(app, resource)
//   Chama resource.onRequest(req, res) para toda requisição que não bateu com nenhuma rota.

import { MethodNotAllowed } from '../errors/index.js'
import { Logger } from './logger.js'

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete']

const logger = new Logger(null, 'routing')

export function addRoute(app, url, resource, suffix = '') {
  const route = app.route(url)

  for (const httpMethod of HTTP_METHODS) {
    // ex.: 'get' + 'ByKey' -> 'onGetByKey'
    const responderName = 'on' + httpMethod[0].toUpperCase() + httpMethod.slice(1) + suffix

    if (resource[responderName] !== undefined) {
      route[httpMethod](async (req, res) => {
        const urlParams = Object.values(req.params)
        await resource[responderName](req, res, ...urlParams)
      })
    }
  }

  route.all(() => {
    throw new MethodNotAllowed()
  })
}

export function useMiddlewares(app, middlewares) {
  for (const middleware of middlewares) {
    app.use(async (req, res, next) => {
      if (middleware.processResponse !== undefined) {
        // 'close' é disparado quando a resposta termina (ou quando o cliente desconecta no meio)
        res.on('close', async () => {
          try {
            await middleware.processResponse(req, res)
          } catch (error) {
            logger.error(`${middleware.constructor.name}.processResponse failed: ${error.stack}`)
          }
        })
      }

      if (middleware.processRequest !== undefined) {
        await middleware.processRequest(req, res)
      }

      // o middleware já respondeu (ex.: o CorsMiddleware responde o preflight OPTIONS na hora):
      // não segue para os próximos middlewares nem para as rotas
      if (res.headersSent) {
        return
      }

      next()
    })
  }
}

export function addSink(app, resource) {
  app.use(async (req, res) => {
    await resource.onRequest(req, res)
  })
}
