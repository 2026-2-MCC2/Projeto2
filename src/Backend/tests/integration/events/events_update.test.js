import assert from 'node:assert/strict'
import { afterEach, describe, test } from 'node:test'

import { DbUtils } from '../../utils/db_utils.js'
import { ObjectGenerator } from '../../utils/object_generator.js'
import { PayloadGenerator } from '../../utils/payload_generator.js'
import { RequestGenerator } from '../../utils/request_generator.js'
import { TokenGenerator } from '../../utils/token_generator.js'

const fixtureUserKeys = []

afterEach(async () => DbUtils.deleteUserFixtures(fixtureUserKeys.splice(0)))

describe('PUT /events/:event_key (RF05)', () => {
  test('validação de schema: payload inválido ou campo extra responde 400', async () => {
    const organizer = await ObjectGenerator.createUserFixture({ profile: 'organizador', status: 'approved' })
    fixtureUserKeys.push(organizer.userKey)
    const headers = TokenGenerator.authorizationHeader('organizador', { userKey: organizer.userKey })

    const [, created] = await RequestGenerator.POST_events(PayloadGenerator.createEventPayload(), headers)

    // 1. Campo extra não permitido
    const [statusExtra, respExtra] = await RequestGenerator.PUT_event_by_key(
      created.event_key,
      PayloadGenerator.createEventUpdatePayload({ campo_invalido: 123 }),
      headers,
    )
    assert.equal(statusExtra, 400)
    assert.equal(respExtra.code, 'APP000001')

    // 2. Campo obrigatório faltando (name)
    const semNome = PayloadGenerator.createEventUpdatePayload()
    delete semNome.name
    const [statusSemNome, respSemNome] = await RequestGenerator.PUT_event_by_key(created.event_key, semNome, headers)
    assert.equal(statusSemNome, 400)
    assert.equal(respSemNome.code, 'APP000001')
  })

  test('organizador atualiza informações do evento com sucesso', async () => {
    const organizer = await ObjectGenerator.createUserFixture({ profile: 'organizador', status: 'approved' })
    fixtureUserKeys.push(organizer.userKey)
    const headers = TokenGenerator.authorizationHeader('organizador', { userKey: organizer.userKey })

    const [, created] = await RequestGenerator.POST_events(PayloadGenerator.createEventPayload(), headers)
    const updatePayload = PayloadGenerator.createEventUpdatePayload()

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
      PayloadGenerator.createEventUpdatePayload({ name: 'Tentativa Hacker' }),
      headersB,
    )
    assert.equal(status, 404)
    assert.equal(response.code, 'EVP000013')
  })

  test('teto de gastos com mais de 2 casas decimais responde 400', async () => {
    const organizer = await ObjectGenerator.createUserFixture({ profile: 'organizador', status: 'approved' })
    fixtureUserKeys.push(organizer.userKey)
    const headers = TokenGenerator.authorizationHeader('organizador', { userKey: organizer.userKey })
    const [, created] = await RequestGenerator.POST_events(PayloadGenerator.createEventPayload(), headers)

    const [status, response] = await RequestGenerator.PUT_event_by_key(
      created.event_key,
      PayloadGenerator.createEventUpdatePayload({ budget_limit: 0.001 }),
      headers,
    )

    assert.equal(status, 400)
    assert.equal(response.code, 'APP000001')
  })

  test('datas e público incoerentes na edição respondem 400 com o erro específico e não mudam o evento', async () => {
    const organizer = await ObjectGenerator.createUserFixture({ profile: 'organizador', status: 'approved' })
    fixtureUserKeys.push(organizer.userKey)
    const headers = TokenGenerator.authorizationHeader('organizador', { userKey: organizer.userKey })
    const [, created] = await RequestGenerator.POST_events(PayloadGenerator.createEventPayload(), headers)

    const invalidCases = [
      [{ start_date: '2026-10-21T14:00:00.000Z', end_date: '2026-10-19T23:00:00.000Z' }, 'EVP000014'],
      [{ min_audience: 9000, expected_audience: 8000, max_audience: 18000 }, 'EVP000016'],
      [{ min_audience: 9000, expected_audience: 13000, max_audience: 12000 }, 'EVP000017'],
      [{ venue_capacity: 15000, max_audience: 18000 }, 'EVP000018'],
      [{ end_date: '2026-02-30T23:00:00.000Z' }, 'EVP000027'],
    ]

    for (const [overrides, code] of invalidCases) {
      const [status, response] = await RequestGenerator.PUT_event_by_key(
        created.event_key,
        PayloadGenerator.createEventUpdatePayload(overrides),
        headers,
      )
      assert.equal(status, 400, code)
      assert.equal(response.code, code)
    }

    const [, stored] = await RequestGenerator.GET_event_by_key(created.event_key, headers)
    assert.equal(stored.name, created.name)
    assert.equal(stored.max_audience, created.max_audience)
  })

  test('edição define, troca e remove o teto de gastos', async () => {
    const organizer = await ObjectGenerator.createUserFixture({ profile: 'organizador', status: 'approved' })
    fixtureUserKeys.push(organizer.userKey)
    const headers = TokenGenerator.authorizationHeader('organizador', { userKey: organizer.userKey })
    const [, created] = await RequestGenerator.POST_events(PayloadGenerator.createEventPayload({ budget_limit: 100000 }), headers)

    const [, trocado] = await RequestGenerator.PUT_event_by_key(
      created.event_key,
      PayloadGenerator.createEventUpdatePayload({ budget_limit: 80000 }),
      headers,
    )
    const [, removido] = await RequestGenerator.PUT_event_by_key(
      created.event_key,
      PayloadGenerator.createEventUpdatePayload({ budget_limit: null }),
      headers,
    )

    assert.equal(trocado.budget_limit, 80000)
    assert.equal(removido.budget_limit, null)
  })
})
