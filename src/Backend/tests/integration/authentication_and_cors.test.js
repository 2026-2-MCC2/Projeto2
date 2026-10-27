// Testes do login (UserAuthenticationMiddleware) e do CORS (CorsMiddleware).
// Usam a rota de exemplo /event_planning/sample_entities porque ela exige login.

import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { ClientRequisition } from '../utils/requisition.js'
import { TokenGenerator } from '../utils/token_generator.js'

// o front-end local, liberado no CORS_ALLOWED_ORIGINS do local.env
const ALLOWED_ORIGIN = 'http://localhost:5173'

describe('Login (token JWT)', () => {
  test('sem token responde 401', async () => {
    const response = await ClientRequisition.send('GET', '/event_planning/sample_entities')
    assert.equal(response.responseStatus, 401)
    assert.equal(response.responseJson.code, 'APP000401')
  })

  test('token que não é Bearer responde 401', async () => {
    const response = await ClientRequisition.send('GET', '/event_planning/sample_entities', {
      headers: { Authorization: 'Basic dXN1YXJpbzpzZW5oYQ==' },
    })
    assert.equal(response.responseStatus, 401)
    assert.equal(response.responseJson.code, 'APP000401')
  })

  test('token falsificado responde 401', async () => {
    const response = await ClientRequisition.send('GET', '/event_planning/sample_entities', {
      headers: { Authorization: 'Bearer token.falsificado.123' },
    })
    assert.equal(response.responseStatus, 401)
    assert.equal(response.responseJson.code, 'APP000401')
  })

  test('token vencido responde 401', async () => {
    // expiresIn negativo cria um token que já nasce vencido
    const expiredToken = TokenGenerator.create('organizador', { expiresIn: -10 })
    const response = await ClientRequisition.send('GET', '/event_planning/sample_entities', {
      headers: { Authorization: `Bearer ${expiredToken}` },
    })
    assert.equal(response.responseStatus, 401)
    assert.equal(response.responseJson.code, 'APP000401')
  })

  test('token válido passa', async () => {
    const response = await ClientRequisition.send('GET', '/event_planning/sample_entities', {
      headers: TokenGenerator.authorizationHeader('fornecedor'),
    })
    assert.equal(response.responseStatus, 200)
  })

  test('mensagem de erro chega com acentos para o front-end', async () => {
    const response = await ClientRequisition.send('GET', '/event_planning/sample_entities')
    assert.equal(response.responseJson.translation, 'Sua sessão expirou ou você não está logado. Faça login novamente.')
  })

  test('home e health check não exigem login', async () => {
    const home = await ClientRequisition.send('GET', '/event_planning/')
    assert.equal(home.responseStatus, 200)

    const healthCheck = await ClientRequisition.send('GET', '/event_planning/health_check')
    assert.equal(healthCheck.responseStatus, 204)
  })
})

describe('CORS', () => {
  test('preflight do front-end liberado responde 204 com as permissões', async () => {
    const response = await ClientRequisition.send('OPTIONS', '/event_planning/sample_entity', {
      headers: {
        Origin: ALLOWED_ORIGIN,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type, authorization',
      },
    })
    assert.equal(response.responseStatus, 204)

    const headers = response.response.headers
    assert.equal(headers.get('access-control-allow-origin'), ALLOWED_ORIGIN)
    assert.match(headers.get('access-control-allow-methods'), /POST/)
    assert.match(headers.get('access-control-allow-headers'), /Authorization/)
  })

  test('site não liberado não recebe permissão', async () => {
    const response = await ClientRequisition.send('OPTIONS', '/event_planning/sample_entity', {
      headers: { Origin: 'https://site-desconhecido.com', 'Access-Control-Request-Method': 'POST' },
    })
    assert.equal(response.response.headers.get('access-control-allow-origin'), null)
  })

  test('respostas de erro também têm o header de CORS', async () => {
    // sem isso o navegador esconderia o 401 do front-end, que não saberia mandar para o login
    const response = await ClientRequisition.send('GET', '/event_planning/sample_entities', {
      headers: { Origin: ALLOWED_ORIGIN },
    })
    assert.equal(response.responseStatus, 401)
    assert.equal(response.response.headers.get('access-control-allow-origin'), ALLOWED_ORIGIN)
  })
})
