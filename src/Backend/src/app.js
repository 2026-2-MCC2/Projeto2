// Monta a API: registra os middlewares, as rotas e o tratamento de erros.
// Comece a leitura do projeto por aqui.
//
// AS CAMADAS (cada pasta de src/ tem uma responsabilidade)
//   resources/     a "recepção": recebe a requisição HTTP, valida o que chegou e devolve a resposta
//   schemas/       arquivos JSON Schema com as regras do que pode chegar no body
//   controllers/   as regras de negócio (ex.: "só dá para mudar o status se estiver pending")
//   repositories/  as consultas ao banco de dados
//   models/        a descrição das tabelas do banco, para o JavaScript conhecer as colunas
//   dtos/          o formato do JSON que a API devolve
//   errors/        os erros que a API pode devolver, cada um com código e status HTTP
//   middlewares/   etapas que toda requisição atravessa antes de chegar no resource (log, token, banco)
//   connectors/    conexões com coisas de fora: banco, Secret Manager, outras APIs
//   utils/         ferramentas usadas em vários lugares (logger, validação, CPF/CNPJ etc.)
//
// Uma requisição desce as camadas e a resposta sobe de volta:
//   requisição -> middlewares -> resource -> controller -> repository -> banco
//   resposta   <- resource <- controller (DTO) <- repository <- banco
//
// COMO CRIAR UM ENDPOINT NOVO (ex.: DELETE /event_planning/sample_entity/:sample_entity_key)
//   1. schemas/      se recebe body, crie o arquivo .json com as regras
//   2. repositories/ crie o método que fala com o banco (ex.: delete)
//   3. controllers/  crie o método com a regra de negócio, chamando o repository e o commit
//   4. resources/    crie o método onDeleteByKey no SampleEntityResource. Se só alguns perfis podem
//                    usar a rota, a primeira linha do método é:
//                    SecurityTools.requireProfile(req.context, [USER_PROFILES.ORGANIZER])
//   5. aqui          nada! A rota '/event_planning/sample_entity/:sample_entity_key' com sufixo
//                    'ByKey' já existe, e o addRoute encontra o onDeleteByKey sozinho.
//                    Para uma URL nova, adicione um addRoute(...). Se a rota não exige login
//                    (ex.: login e autocadastro), coloque a URL em PUBLIC_ENDPOINTS no constants.js
//   6. tests/        escreva o teste de integração
//
// Para uma tabela nova: crie a tabela no database/database.sql, o model em models/ e repita os passos.

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
} from './middlewares/index.js'
import { HealthCheckResource, HomeResource, SampleEntityResource, SinkResource } from './resources/index.js'
import { addRoute, addSink, useMiddlewares } from './utils/routing.js'

export function create() {
  const app = express()

  // não revela que a API é feita em Express
  app.disable('x-powered-by')
  // no Cloud Run a requisição passa por um load balancer; isso faz req.ip ter o IP real do cliente
  app.set('trust proxy', true)

  // Middlewares, na ordem em que rodam em cada requisição:
  //   SecureHeaders                headers de segurança em toda resposta
  //   CorsMiddleware               libera o front-end a chamar a API; responde o preflight OPTIONS.
  //                                Vem antes de tudo para as respostas de erro (401, 404...) também
  //                                saírem com os headers de CORS, senão o navegador esconde o erro do front
  //   ContextCreator               cria o req.context
  //   InputOutputMiddleware        lê o body e loga entrada e saída
  //   UserAuthenticationMiddleware confere o login (token JWT) e preenche req.context.user
  //   SessionManager               abre a transação do banco (só depois do login, para não gastar
  //                                conexão com requisição que vai ser recusada)
  useMiddlewares(app, [
    new SecureHeaders(),
    new CorsMiddleware(),
    new ContextCreator(),
    new InputOutputMiddleware(),
    new UserAuthenticationMiddleware(),
    new SessionManager(),
  ])

  // Rotas. Cada addRoute liga uma URL a um resource (ver utils/routing.js).
  const homeResource = new HomeResource()
  addRoute(app, `${API_PREFIX}/`, homeResource)

  const healthCheckResource = new HealthCheckResource()
  addRoute(app, `${API_PREFIX}/health_check`, healthCheckResource)

  // Entidade de EXEMPLO: mostra o caminho completo de um endpoint (resource, controller, repository).
  // Usem como modelo e apaguem quando o projeto tiver os próprios endpoints.
  const sampleEntityResource = new SampleEntityResource()
  addRoute(app, `${API_PREFIX}/sample_entity`, sampleEntityResource)
  addRoute(app, `${API_PREFIX}/sample_entity/:sample_entity_key`, sampleEntityResource, 'ByKey')
  addRoute(app, `${API_PREFIX}/webhook/sample_entity/:sample_entity_key/increment_counter`, sampleEntityResource, 'WebhookIncrementCounter')
  addRoute(app, `${API_PREFIX}/sample_entities`, sampleEntityResource, 'List')

  // Requisições que não bateram com nenhuma rota: 404
  const sinkResource = new SinkResource()
  addSink(app, sinkResource)

  // Qualquer erro lançado durante a requisição vira a resposta de erro padrão
  app.use(APIErrorHandler.handle)

  return app
}
