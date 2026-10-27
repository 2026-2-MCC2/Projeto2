// Testes das rotas básicas e dos middlewares (404, 405, JSON mal formado, headers de segurança).
// Os testes de login e CORS estão em authentication_and_cors.test.js.
//
// COMO OS TESTES FUNCIONAM
// Usamos o test runner que já vem no Node (node:test), sem instalar nada:
//   describe('nome do grupo', () => { ... })    agrupa testes relacionados
//   test('o que está sendo testado', async () => { ... })
//   assert.equal(valorRecebido, valorEsperado)   se for diferente, o teste falha e mostra os dois valores
//
// Rodar todos:       npm test
// Rodar um arquivo:  npm test -- tests/integration/health_check.test.js
//
// MODELO PARA UM TESTE NOVO
//   test('não encontra entidade inexistente', async () => {
//     const [status, response] = await RequestGenerator.GET_sample_entity('chave-que-nao-existe')
//     assert.equal(status, 404)
//     assert.equal(response.code, 'EVP000001')
//   })

import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { ClientRequisition } from '../utils/requisition.js'
import { TokenGenerator } from '../utils/token_generator.js'

describe('HealthCheck', () => {
  test('home responde 200', async () => {
    const response = await ClientRequisition.send('GET', '/event_planning/')
    assert.equal(response.responseStatus, 200)
  })

  test('health check responde 204', async () => {
    const response = await ClientRequisition.send('GET', '/event_planning/health_check')
    assert.equal(response.responseStatus, 204)
  })

  test('rota que não existe responde 404', async () => {
    const response = await ClientRequisition.send('PUT', '/event_planning/sample', {
      headers: TokenGenerator.authorizationHeader(),
    })
    assert.equal(response.responseStatus, 404)
    assert.equal(response.responseJson.code, 'APP000404')
  })

  test('método não aceito pela rota responde 405', async () => {
    const response = await ClientRequisition.send('PUT', '/event_planning/health_check')
    assert.equal(response.responseStatus, 405)
    assert.equal(response.responseJson.code, 'APP000405')
  })

  test('JSON mal formado responde 400', async () => {
    const response = await ClientRequisition.send('POST', '/event_planning/sample_entity', {
      data: '{"hello": ',
      headers: { 'Content-Type': 'application/json', ...TokenGenerator.authorizationHeader() },
    })
    assert.equal(response.responseStatus, 400)
    assert.equal(response.responseJson.code, 'APP000001')
  })

  test('respostas têm os headers de segurança', async () => {
    const response = await ClientRequisition.send('GET', '/event_planning/health_check')
    assert.equal(response.responseStatus, 204)

    const headersResponse = response.response.headers
    assert.equal(headersResponse.get('server'), 'undisclosed')
    assert.equal(headersResponse.get('x-frame-options'), 'SAMEORIGIN')
    assert.equal(headersResponse.get('x-xss-protection'), '1; mode=block')
    assert.equal(headersResponse.get('x-content-type-options'), 'nosniff')
    assert.equal(headersResponse.get('strict-transport-security'), 'max-age=63072000; includeSubdomains')
    assert.equal(headersResponse.get('content-security-policy'), "default-src 'self'")
    assert.equal(headersResponse.get('x-powered-by'), null)
  })
})
