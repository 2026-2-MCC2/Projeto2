import express from 'express'

import { API_PREFIX } from './constants.js'
import { APIErrorHandler } from './errors/index.js'
import {
  ContextCreator,
  CorsMiddleware,
  InputOutputMiddleware,
  SecureHeaders,
  SessionManager,
  UserAuthenticationMiddleware,
  UserStatusMiddleware,
} from './middlewares/index.js'
import {
  AdminUserResource,
  AuthResource,
  EventResource,
  HealthCheckResource,
  HomeResource,
  MeResource,
  SinkResource,
} from './resources/index.js'
import { addRoute, addSink, useMiddlewares } from './utils/routing.js'

export function create() {
  const app = express()

  app.disable('x-powered-by')
  // no cloud run há um load balancer na frente; assim req.ip é o ip real do cliente
  app.set('trust proxy', true)

  // cors antes de tudo para que respostas de erro também levem os headers (senão o navegador esconde o erro);
  // sessão do banco só depois do login, para não gastar conexão com requisição recusada
  useMiddlewares(app, [
    new SecureHeaders(),
    new CorsMiddleware(),
    new ContextCreator(),
    new InputOutputMiddleware(),
    new UserAuthenticationMiddleware(),
    new SessionManager(),
    new UserStatusMiddleware(),
  ])

  const homeResource = new HomeResource()
  addRoute(app, `${API_PREFIX}/`, homeResource)

  const healthCheckResource = new HealthCheckResource()
  addRoute(app, `${API_PREFIX}/health_check`, healthCheckResource)

  const authResource = new AuthResource()
  addRoute(app, `${API_PREFIX}/auth/cadastro`, authResource, 'Cadastro')
  addRoute(app, `${API_PREFIX}/auth/verificar-cnpj`, authResource, 'VerificarCnpj')
  addRoute(app, `${API_PREFIX}/auth/login`, authResource, 'Login')
  addRoute(app, `${API_PREFIX}/auth/esqueci-senha`, authResource, 'EsqueciSenha')
  addRoute(app, `${API_PREFIX}/auth/redefinir-senha`, authResource, 'RedefinirSenha')

  const meResource = new MeResource()
  addRoute(app, `${API_PREFIX}/me`, meResource)
  addRoute(app, `${API_PREFIX}/me/categorias`, meResource, 'Categorias')
  addRoute(app, `${API_PREFIX}/me/senha`, meResource, 'Senha')

  const adminUserResource = new AdminUserResource()
  addRoute(app, `${API_PREFIX}/admin/users`, adminUserResource, 'List')
  addRoute(app, `${API_PREFIX}/admin/users/:user_key/status`, adminUserResource, 'ByKey')
  addRoute(app, `${API_PREFIX}/admin/users/:user_key/redefinicao-de-senha`, adminUserResource, 'PasswordResetByKey')

  const eventResource = new EventResource()
  addRoute(app, `${API_PREFIX}/events`, eventResource, 'List')
  addRoute(app, `${API_PREFIX}/events/:event_key`, eventResource, 'ByKey')
  addRoute(app, `${API_PREFIX}/events/:event_key/proposals`, eventResource, 'Proposals')
  addRoute(app, `${API_PREFIX}/events/:event_key/proposals/:proposal_key/accept`, eventResource, 'ProposalAccept')
  addRoute(app, `${API_PREFIX}/events/:event_key/status`, eventResource, 'StatusByKey')
  addRoute(app, `${API_PREFIX}/events/:event_key/internal-costs`, eventResource, 'InternalCosts')
  addRoute(app, `${API_PREFIX}/events/:event_key/internal-costs/:internal_cost_key`, eventResource, 'InternalCostByKey')

  const sinkResource = new SinkResource()
  addSink(app, sinkResource)

  app.use(APIErrorHandler.handle)

  return app
}
