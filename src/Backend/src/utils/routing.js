import { MethodNotAllowed } from '../errors/index.js'
import { Logger } from './logger.js'

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete']

const logger = new Logger(null, 'routing')

export function addRoute(app, url, resource, suffix = '') {
  const route = app.route(url)

  for (const httpMethod of HTTP_METHODS) {
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
        // 'close' também dispara quando o cliente desconecta no meio da resposta
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

      // o middleware já respondeu (ex.: preflight do cors)
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
