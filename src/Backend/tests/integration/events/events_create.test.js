import assert from 'node:assert/strict'
import { afterEach, describe, test } from 'node:test'

import { DbUtils } from '../../utils/db_utils.js'
import { ObjectGenerator } from '../../utils/object_generator.js'
import { PayloadGenerator } from '../../utils/payload_generator.js'
import { RequestGenerator } from '../../utils/request_generator.js'
import { TokenGenerator } from '../../utils/token_generator.js'

const fixtureUserKeys = []

afterEach(async () => DbUtils.deleteUserFixtures(fixtureUserKeys.splice(0)))

describe('POST /events (RF05, RF07)', () => {
  test('validação de schema: campo obrigatório ausente, tipo inválido ou campo extra responde 400', async () => {
    const organizer = await ObjectGenerator.createUserFixture({ profile: 'organizador', status: 'approved' })
    fixtureUserKeys.push(organizer.userKey)
    const headers = TokenGenerator.authorizationHeader('organizador', { userKey: organizer.userKey })

    // 1. Campo obrigatório faltando (name)
    const semNome = PayloadGenerator.createEventPayload()
    delete semNome.name
    const [statusSemNome, respSemNome] = await RequestGenerator.POST_events(semNome, headers)
    assert.equal(statusSemNome, 400)
    assert.equal(respSemNome.code, 'APP000001')

    // 2. Tipo inválido (min_audience como string)
    const tipoInvalido = PayloadGenerator.createEventPayload({ min_audience: 'mil' })
    const [statusTipo, respTipo] = await RequestGenerator.POST_events(tipoInvalido, headers)
    assert.equal(statusTipo, 400)
    assert.equal(respTipo.code, 'APP000001')

    // 3. Campo extra proibido
    const comCampoExtra = PayloadGenerator.createEventPayload({ campo_desconhecido: 'invalido' })
    const [statusExtra, respExtra] = await RequestGenerator.POST_events(comCampoExtra, headers)
    assert.equal(statusExtra, 400)
    assert.equal(respExtra.code, 'APP000001')

    // 4. Margem de lucro >= 1
    const margemInvalida = PayloadGenerator.createEventPayload({ profit_margin: 1.5 })
    const [statusMargem, respMargem] = await RequestGenerator.POST_events(margemInvalida, headers)
    assert.equal(statusMargem, 400)
    assert.equal(respMargem.code, 'APP000001')

    // 5. Custo interno inválido
    const custoInvalido = PayloadGenerator.createEventPayload({
      internal_costs: [{ type: 'categoria_inexistente', description: 'Teste', amount: 100 }],
    })
    const [statusCusto, respCusto] = await RequestGenerator.POST_events(custoInvalido, headers)
    assert.equal(statusCusto, 400)
    assert.equal(respCusto.code, 'APP000001')
  })

  test('organizador aprovado cria evento válido e recebe 201 com dados do evento e custos', async () => {
    const organizer = await ObjectGenerator.createUserFixture({ profile: 'organizador', status: 'approved' })
    fixtureUserKeys.push(organizer.userKey)
    const headers = TokenGenerator.authorizationHeader('organizador', { userKey: organizer.userKey })

    const eventPayload = PayloadGenerator.createEventPayload()
    const [status, response] = await RequestGenerator.POST_events(eventPayload, headers)

    assert.equal(status, 201)
    assert.ok(response.event_key)
    assert.equal(response.name, eventPayload.name)
    assert.equal(response.category, eventPayload.category)
    assert.equal(response.description, eventPayload.description)
    assert.equal(response.venue_name, eventPayload.venue_name)
    assert.equal(response.address, eventPayload.address)
    assert.equal(response.city, eventPayload.city)
    assert.equal(response.state, eventPayload.state)
    assert.equal(response.zip_code, eventPayload.zip_code)
    assert.equal(response.venue_capacity, eventPayload.venue_capacity)
    assert.equal(response.min_audience, eventPayload.min_audience)
    assert.equal(response.expected_audience, eventPayload.expected_audience)
    assert.equal(response.max_audience, eventPayload.max_audience)
    assert.equal(Number(response.profit_margin), 0.2)
    assert.equal(response.reference_scenario, 'expected')
    assert.equal(response.status, 'draft')
    assert.ok(Array.isArray(response.internal_costs))
    assert.equal(response.internal_costs.length, 2)
    assert.equal(response.total_internal_cost, 42100)
  })

  test('sem token responde 401', async () => {
    const eventPayload = PayloadGenerator.createEventPayload()
    const [status, response] = await RequestGenerator.POST_events(eventPayload)

    assert.equal(status, 401)
    assert.equal(response.code, 'APP000401')
  })

  test('perfil não-organizador (fornecedor ou admin) responde 403', async () => {
    const supplier = await ObjectGenerator.createUserFixture({ profile: 'fornecedor', status: 'approved' })
    fixtureUserKeys.push(supplier.userKey)
    const headers = TokenGenerator.authorizationHeader('fornecedor', { userKey: supplier.userKey })

    const eventPayload = PayloadGenerator.createEventPayload()
    const [status, response] = await RequestGenerator.POST_events(eventPayload, headers)

    assert.equal(status, 403)
    assert.equal(response.code, 'APP000403')
  })

  test('data de término anterior à de início responde 400 com erro específico (EVP000014)', async () => {
    const organizer = await ObjectGenerator.createUserFixture({ profile: 'organizador', status: 'approved' })
    fixtureUserKeys.push(organizer.userKey)
    const headers = TokenGenerator.authorizationHeader('organizador', { userKey: organizer.userKey })

    const invalidPayload = PayloadGenerator.createEventPayload({
      start_date: '2026-10-25T14:00:00.000Z',
      end_date: '2026-10-20T14:00:00.000Z',
    })
    const [status, response] = await RequestGenerator.POST_events(invalidPayload, headers)

    assert.equal(status, 400)
    assert.equal(response.code, 'EVP000014')
    assert.equal(response.translation, 'A data de término do evento não pode ser anterior à data de início.')
  })

  test('público esperado menor que mínimo responde 400 com EVP000016', async () => {
    const organizer = await ObjectGenerator.createUserFixture({ profile: 'organizador', status: 'approved' })
    fixtureUserKeys.push(organizer.userKey)
    const headers = TokenGenerator.authorizationHeader('organizador', { userKey: organizer.userKey })

    const invalidPayload = PayloadGenerator.createEventPayload({
      min_audience: 10000,
      expected_audience: 8000,
      max_audience: 12000,
    })
    const [status, response] = await RequestGenerator.POST_events(invalidPayload, headers)

    assert.equal(status, 400)
    assert.equal(response.code, 'EVP000016')
    assert.equal(response.translation, 'O público esperado não pode ser menor que o público mínimo informado.')
  })

  test('público máximo menor que esperado responde 400 com EVP000017', async () => {
    const organizer = await ObjectGenerator.createUserFixture({ profile: 'organizador', status: 'approved' })
    fixtureUserKeys.push(organizer.userKey)
    const headers = TokenGenerator.authorizationHeader('organizador', { userKey: organizer.userKey })

    const invalidPayload = PayloadGenerator.createEventPayload({
      min_audience: 5000,
      expected_audience: 8000,
      max_audience: 7000,
    })
    const [status, response] = await RequestGenerator.POST_events(invalidPayload, headers)

    assert.equal(status, 400)
    assert.equal(response.code, 'EVP000017')
    assert.equal(response.translation, 'O público máximo não pode ser menor que o público esperado informado.')
  })

  test('público máximo superior à capacidade do espaço responde 400 com EVP000018', async () => {
    const organizer = await ObjectGenerator.createUserFixture({ profile: 'organizador', status: 'approved' })
    fixtureUserKeys.push(organizer.userKey)
    const headers = TokenGenerator.authorizationHeader('organizador', { userKey: organizer.userKey })

    const invalidPayload = PayloadGenerator.createEventPayload({
      venue_capacity: 5000,
      min_audience: 2000,
      expected_audience: 4000,
      max_audience: 6000,
    })
    const [status, response] = await RequestGenerator.POST_events(invalidPayload, headers)

    assert.equal(status, 400)
    assert.equal(response.code, 'EVP000018')
    assert.equal(response.translation, 'A capacidade do espaço não pode ser menor que o público máximo do evento.')
  })
})
