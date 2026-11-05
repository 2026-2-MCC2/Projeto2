import express from 'express'

import { API_PREFIX, STORAGE_DRIVER } from './constants.js'
import { STORAGE_DRIVERS } from './connectors/storage/index.js'
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
  AdminReportResource,
  AdminUserResource,
  AuthResource,
  BudgetItemResource,
  EventResource,
  HealthCheckResource,
  HomeResource,
  LocalFileResource,
  MeResource,
  SinkResource,
  SupplierEventResource,
  SupplierProposalResource,
} from './resources/index.js'
import { addRoute, addSink, useMiddlewares } from './utils/routing.js'

export function create() {
  const app = express()

  app.disable('x-powered-by')
  // no cloud run há um load balancer na frente; assim req.ip é o ip real do cliente
  app.set('trust proxy', true)

  // arquivos do armazenamento local (só em desenvolvimento e testes): antes dos middlewares, porque
  // uma tag <img> não manda o token de login; quem protege o arquivo é a URL assinada
  if (STORAGE_DRIVER === STORAGE_DRIVERS.LOCAL) {
    const localFileResource = new LocalFileResource()
    app.get(`${API_PREFIX}/files/*path`, (req, res) => localFileResource.onGet(req, res))
  }

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

  const adminReportResource = new AdminReportResource()
  addRoute(app, `${API_PREFIX}/admin/reports`, adminReportResource)

  const eventResource = new EventResource()
  addRoute(app, `${API_PREFIX}/events`, eventResource, 'List')
  addRoute(app, `${API_PREFIX}/events/:event_key`, eventResource, 'ByKey')
  addRoute(app, `${API_PREFIX}/events/:event_key/proposals`, eventResource, 'Proposals')
  addRoute(app, `${API_PREFIX}/events/:event_key/proposals/:proposal_key/accept`, eventResource, 'ProposalAccept')
  addRoute(app, `${API_PREFIX}/events/:event_key/status`, eventResource, 'StatusByKey')
  addRoute(app, `${API_PREFIX}/events/:event_key/internal-costs`, eventResource, 'InternalCosts')
  addRoute(app, `${API_PREFIX}/events/:event_key/internal-costs/:internal_cost_key`, eventResource, 'InternalCostByKey')

  const budgetItemResource = new BudgetItemResource()
  addRoute(app, `${API_PREFIX}/events/:event_key/items`, budgetItemResource, 'Items')
  addRoute(app, `${API_PREFIX}/events/:event_key/items/:item_key`, budgetItemResource, 'ItemsByKey')

  const supplierEventResource = new SupplierEventResource()
  addRoute(app, `${API_PREFIX}/supplier/events`, supplierEventResource, 'List')
  addRoute(app, `${API_PREFIX}/supplier/events/:event_key`, supplierEventResource, 'ByKey')
  addRoute(app, `${API_PREFIX}/supplier/events/:event_key/items/:item_key/proposals`, supplierEventResource, 'ItemProposals')

  const supplierProposalResource = new SupplierProposalResource()
  addRoute(app, `${API_PREFIX}/supplier/proposals`, supplierProposalResource, 'List')
  addRoute(app, `${API_PREFIX}/supplier/proposals/:proposal_key`, supplierProposalResource, 'ByKey')
  addRoute(app, `${API_PREFIX}/supplier/proposals/:proposal_key/photos`, supplierProposalResource, 'Photos')
  addRoute(app, `${API_PREFIX}/supplier/proposals/:proposal_key/photos/:photo_key`, supplierProposalResource, 'PhotosByKey')

  const sinkResource = new SinkResource()
  addSink(app, sinkResource)

  app.use(APIErrorHandler.handle)

  return app
}
