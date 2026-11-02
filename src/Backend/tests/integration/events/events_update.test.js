import assert from 'node:assert/strict'
import { afterEach, describe, test } from 'node:test'

import { DbUtils } from '../../utils/db_utils.js'
import { ObjectGenerator } from '../../utils/object_generator.js'
import { PayloadGenerator } from '../../utils/payload_generator.js'
import { RequestGenerator } from '../../utils/request_generator.js'
import { TokenGenerator } from '../../utils/token_generator.js'

const fixtureUserKeys = []

afterEach(async () => DbUtils.deleteUserFixtures(fixtureUserKeys.splice(0)))

function createValidUpdatePayload(overrides = {}) {
  return {
    name: 'Festival Primavera Som & Luz 2026 - Edição Especial',
    category: 'Festival',
    description: 'Nova descrição atualizada',
    start_date: '2026-10-19T14:00:00.000Z',
    end_date: '2026-10-21T23:00:00.000Z',
    venue_name: 'Novo Espaço',
    address: 'Nova Rua, 100',
    city: 'São Paulo',
    state: 'SP',
    zip_code: '05001100',
    venue_capacity: 25000,
    min_audience: 9000,
    expected_audience: 13000,
    max_audience: 18000,
    profit_margin: 0.25,
    reference_scenario: 'expected',
    ...overrides,
  }
}

describe('PUT /events/:event_key (RF05)', () => {
  test('validação de schema: payload inválido ou campo extra responde 400', async () => {
    const organizer = await ObjectGenerator.createUserFixture({ profile: 'organizador', status: 'approved' })
    fixtureUserKeys.push(organizer.userKey)
    const headers = TokenGenerator.authorizationHeader('organizador', { userKey: organizer.userKey })

    const [, created] = await RequestGenerator.POST_events(PayloadGenerator.createEventPayload(), headers)

    // 1. Campo extra não permitido
    const [statusExtra, respExtra] = await RequestGenerator.PUT_event_by_key(
      created.event_key,
      createValidUpdatePayload({ campo_invalido: 123 }),
      headers,
    )
    assert.equal(statusExtra, 400)
    assert.equal(respExtra.code, 'APP000001')

    // 2. Campo obrigatório faltando (name)
    const semNome = createValidUpdatePayload()
    delete semNome.name
    const [statusSemNome, respSemNome] = await RequestGenerator.PUT_event_by_key(
      created.event_key,
      semNome,
      headers,
    )
    assert.equal(statusSemNome, 400)
    assert.equal(respSemNome.code, 'APP000001')
  })

  test('organizador atualiza informações do evento com sucesso', async () => {
    const organizer = await ObjectGenerator.createUserFixture({ profile: 'organizador', status: 'approved' })
    fixtureUserKeys.push(organizer.userKey)
    const headers = TokenGenerator.authorizationHeader('organizador', { userKey: organizer.userKey })

    const [, created] = await RequestGenerator.POST_events(PayloadGenerator.createEventPayload(), headers)
    const updatePayload = createValidUpdatePayload()

    const [status, response] = await RequestGenerator.PUT_event_by_key(created.event_key, updatePayload, headers)

    assert.equal(status, 200)
    assert.equal(response.name, updatePayload.name)
    assert.equal(response.venue_name, updatePayload.venue_name)
    assert.equal(Number(response.profit_margin), 0.25)
  })

  test('tentativa de atualizar evento de outro organizador responde 404 (EVP000013)', async () => {
    const organizerA = await ObjectGenerator.createUserFixture({ profile: 'organizador', status: 'approved' })
    const organizerB = await ObjectGenerator.createUserFixture({ profile: 'organizador', status: 'approved' })
    fixtureUserKeys.push(organizerA.userKey, organizerB.userKey)

    const headersA = TokenGenerator.authorizationHeader('organizador', { userKey: organizerA.userKey })
    const headersB = TokenGenerator.authorizationHeader('organizador', { userKey: organizerB.userKey })

    const [, created] = await RequestGenerator.POST_events(PayloadGenerator.createEventPayload(), headersA)

    const [status, response] = await RequestGenerator.PUT_event_by_key(
      created.event_key,
      createValidUpdatePayload({ name: 'Tentativa Hacker' }),
      headersB,
    )
    assert.equal(status, 404)
    assert.equal(response.code, 'EVP000013')
  })
})
