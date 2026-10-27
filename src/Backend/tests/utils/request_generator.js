// Um método por endpoint da API, já com o token de login, para os testes ficarem curtos.
// O nome é MÉTODO_HTTP + recurso. Cada método devolve [status, body], que se lê assim:
//   const [status, response] = await RequestGenerator.GET_sample_entity(key)
//   assert.equal(status, 200)
//   assert.equal(response.status, 'pending')
//
// Endpoint novo na API? Crie o método correspondente aqui.

import { ClientRequisition } from './requisition.js'
import { TokenGenerator } from './token_generator.js'

// header de um usuário logado (organizador), usado nas rotas de exemplo
const USER_HEADERS = TokenGenerator.authorizationHeader('organizador')

export class RequestGenerator {
  static async POST_sample_entity(sampleEntityPayload) {
    const response = await ClientRequisition.send('POST', '/event_planning/sample_entity', {
      payload: sampleEntityPayload,
      headers: USER_HEADERS,
    })
    return [response.responseStatus, response.responseJson]
  }

  static async GET_sample_entity(sampleEntityKey) {
    const response = await ClientRequisition.send('GET', `/event_planning/sample_entity/${sampleEntityKey}`, {
      headers: USER_HEADERS,
    })
    return [response.responseStatus, response.responseJson]
  }

  static async PUT_sample_entity(sampleEntityKey, updatePayload) {
    const response = await ClientRequisition.send('PUT', `/event_planning/sample_entity/${sampleEntityKey}`, {
      payload: updatePayload,
      headers: USER_HEADERS,
    })
    return [response.responseStatus, response.responseJson]
  }

  static async PUT_webhook_sample_entity(sampleEntityKey) {
    const response = await ClientRequisition.send('PUT', `/event_planning/webhook/sample_entity/${sampleEntityKey}/increment_counter`, {
      headers: USER_HEADERS,
    })
    return [response.responseStatus, response.responseJson]
  }

  static async GET_sample_entities(params) {
    const response = await ClientRequisition.send('GET', '/event_planning/sample_entities', {
      headers: USER_HEADERS,
      queryParams: params,
    })
    return [response.responseStatus, response.responseJson]
  }
}
