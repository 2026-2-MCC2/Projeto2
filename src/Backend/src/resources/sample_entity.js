// Resource: recebe a requisição HTTP e devolve a resposta.
// Cada método on... atende um método HTTP de uma rota (a ligação é feita pelo addRoute no app.js).
// Um método de resource só faz três coisas:
//   1. valida o que chegou (body com SchemaHandler, query string com getParam/getParamAsInt)
//   2. chama o controller
//   3. responde com o status HTTP certo
// Regra de negócio fica no controller, não aqui.
//
// Dentro de um método:
//   req.context.media  body da requisição já convertido de JSON
//   req.context        contexto da requisição (ver utils/context.js)
//   res.status(201).json({...})  responde com status e JSON
//   res.status(204).end()        responde sem body
//
// Status HTTP de sucesso usados aqui:
//   200 OK          deu certo e tem resposta
//   201 Created     algo foi criado
//   202 Accepted    alteração aceita
//   204 No Content  deu certo e não tem body na resposta
// (os de erro estão explicados em errors/base_error.js)
//
// Para testar na mão, use os comandos curl abaixo no terminal (ou monte a mesma requisição no
// Postman/Insomnia). Todos precisam estar logados, com o header "Authorization: Bearer <token>".
// Enquanto o login não existe, gere um token de teste com: npm run token -- organizador

import { SampleEntityController } from '../controllers/sample_entity_controller.js'
import { getParam, getParamAsInt } from '../utils/request_params.js'
import { SchemaHandler } from '../utils/schema_handler.js'

export class SampleEntityResource {
  // POST /event_planning/sample_entity
  //   curl -X POST localhost:3300/event_planning/sample_entity \
  //     -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"hello": "world"}'
  //   201 { "sample_entity_key": "6f1c2a9e-..." }
  async onPost(req, res) {
    SchemaHandler.validate(req, 'post_sample_entity.json')

    const sampleEntityController = new SampleEntityController(req.context)
    const sampleEntity = await sampleEntityController.create(req.context.media)

    res.status(201).json(sampleEntity)
  }

  // GET /event_planning/sample_entity/:sample_entity_key
  //   curl localhost:3300/event_planning/sample_entity/6f1c2a9e-... -H "Authorization: Bearer $TOKEN"
  //   200 { "hello": "world", "status": "pending", "sample_entity_key": "6f1c2a9e-...", "counter": 0 }
  //   404 { "code": "EVP000001", ... } se a chave não existir
  async onGetByKey(req, res, sampleEntityKey) {
    const sampleEntityController = new SampleEntityController(req.context)

    const sampleEntityDto = await sampleEntityController.getByKey(sampleEntityKey)

    res.status(200).json(sampleEntityDto)
  }

  // PUT /event_planning/sample_entity/:sample_entity_key
  //   curl -X PUT localhost:3300/event_planning/sample_entity/6f1c2a9e-... \
  //     -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"status": "success"}'
  //   202 { "sample_entity_key": "6f1c2a9e-..." }
  //   409 { "code": "EVP000002", ... } se a entidade não estiver "pending"
  async onPutByKey(req, res, sampleEntityKey) {
    SchemaHandler.validate(req, 'put_sample_entity.json')

    const sampleEntityController = new SampleEntityController(req.context)

    const sampleEntityDto = await sampleEntityController.updateStatus(sampleEntityKey, req.context.media)

    res.status(202).json(sampleEntityDto)
  }

  // PUT /event_planning/webhook/sample_entity/:sample_entity_key/increment_counter
  //   curl -X PUT localhost:3300/event_planning/webhook/sample_entity/6f1c2a9e-.../increment_counter \
  //     -H "Authorization: Bearer $TOKEN"
  //   204 (sem body)
  async onPutWebhookIncrementCounter(req, res, sampleEntityKey) {
    const sampleEntityController = new SampleEntityController(req.context)

    await sampleEntityController.webhookIncrementCounter(sampleEntityKey)

    res.status(204).end()
  }

  // GET /event_planning/sample_entities?limit=10&page=0&status=pending
  //   curl 'localhost:3300/event_planning/sample_entities?limit=2' -H "Authorization: Bearer $TOKEN"
  //   200 { "data": [ {...}, {...} ], "limit": 2, "page": 0, "is_last_page": false }
  async onGetList(req, res) {
    const sampleEntityController = new SampleEntityController(req.context)

    const limit = getParamAsInt(req, 'limit', { minValue: 0, maxValue: 100, default: 10 })
    const page = getParamAsInt(req, 'page', { minValue: 0, default: 0 })
    const offset = page * limit

    const status = getParam(req, 'status')

    const filtersDict = { status: status }

    const sampleEntitiesPage = await sampleEntityController.getList(limit, offset, filtersDict)

    res.status(200).json({
      data: sampleEntitiesPage.sampleEntitiesListDto,
      limit: limit,
      page: page,
      is_last_page: sampleEntitiesPage.isLastPage,
    })
  }
}
