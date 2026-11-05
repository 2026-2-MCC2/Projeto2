import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { ClientRequisition } from '../utils/requisition.js'
import { TokenGenerator } from '../utils/token_generator.js'

describe('HealthCheck', () => {
  test('home responde 200 sem login', async () => {
    const response = await ClientRequisition.send('GET', '/event_planning/')
    assert.equal(response.responseStatus, 200)
  })

  test('health check responde 204 sem login', async () => {
    const response = await ClientRequisition.send('GET', '/event_planning/health_check')
    assert.equal(response.responseStatus, 204)
  })

  test('rota que não existe responde 404', async () => {
    const response = await ClientRequisition.send('PUT', '/event_planning/rota-inexistente', {
      headers: TokenGenerator.authorizationHeader('organizador', { userKey: '00000000-0000-4000-8000-000000000010' }),
    })
    assert.equal(response.responseStatus, 404)
    assert.equal(response.responseJson.code, 'APP000404')
    assert.equal(response.responseJson.translation, 'O endereço solicitado não existe.')
  })

  test('método não aceito pela rota responde 405', async () => {
    const response = await ClientRequisition.send('PUT', '/event_planning/health_check')
    assert.equal(response.responseStatus, 405)
    assert.equal(response.responseJson.code, 'APP000405')
    assert.equal(response.responseJson.translation, 'Esta ação não é permitida neste endereço.')
  })

  test('JSON mal formado responde 400', async () => {
    const response = await ClientRequisition.send('POST', '/event_planning/auth/login', {
      data: '{"email": ',
      headers: { 'Content-Type': 'application/json' },
    })
    assert.equal(response.responseStatus, 400)
    assert.equal(response.responseJson.code, 'APP000001')
    assert.equal(response.responseJson.translation, 'Alguns campos estão inválidos. Confira os dados e tente de novo.')
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
