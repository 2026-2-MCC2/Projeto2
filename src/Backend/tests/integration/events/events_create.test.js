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

  test('CEP com hífen é gravado só com os números', async () => {
    const organizer = await ObjectGenerator.createUserFixture({ profile: 'organizador', status: 'approved' })
    fixtureUserKeys.push(organizer.userKey)
    const headers = TokenGenerator.authorizationHeader('organizador', { userKey: organizer.userKey })

    const [status, response] = await RequestGenerator.POST_events(PayloadGenerator.createEventPayload({ zip_code: '01310-100' }), headers)

    assert.equal(status, 201)
    assert.equal(response.zip_code, '01310100')
  })

  test('CEP sem 8 dígitos ou com letras responde 400', async () => {
    const organizer = await ObjectGenerator.createUserFixture({ profile: 'organizador', status: 'approved' })
    fixtureUserKeys.push(organizer.userKey)
    const headers = TokenGenerator.authorizationHeader('organizador', { userKey: organizer.userKey })

    for (const zipCode of ['123456789', '12345-6789', '1234567', 'abc-defgh', '']) {
      const [status, response] = await RequestGenerator.POST_events(PayloadGenerator.createEventPayload({ zip_code: zipCode }), headers)
      assert.equal(status, 400, zipCode)
      assert.equal(response.code, 'APP000001')
    }
  })

  test('data fora do formato ISO responde 400 de validação', async () => {
    const organizer = await ObjectGenerator.createUserFixture({ profile: 'organizador', status: 'approved' })
    fixtureUserKeys.push(organizer.userKey)
    const headers = TokenGenerator.authorizationHeader('organizador', { userKey: organizer.userKey })

    for (const startDate of ['abc', '10/12/2026', '2026-12-10']) {
      const [status, response] = await RequestGenerator.POST_events(PayloadGenerator.createEventPayload({ start_date: startDate }), headers)
      assert.equal(status, 400, startDate)
      assert.equal(response.code, 'APP000001')
    }
  })

  test('custo acima do que o banco guarda responde 400 em vez de 500', async () => {
    const organizer = await ObjectGenerator.createUserFixture({ profile: 'organizador', status: 'approved' })
    fixtureUserKeys.push(organizer.userKey)
    const headers = TokenGenerator.authorizationHeader('organizador', { userKey: organizer.userKey })

    const payload = PayloadGenerator.createEventPayload({
      internal_costs: [{ type: 'tax', description: 'Valor gigante', amount: 1e11 }],
    })
    const [status, response] = await RequestGenerator.POST_events(payload, headers)

    assert.equal(status, 400)
    assert.equal(response.code, 'APP000001')
  })

  test('público, capacidade e quantidade de custos acima do que o banco guarda respondem 400', async () => {
    const organizer = await ObjectGenerator.createUserFixture({ profile: 'organizador', status: 'approved' })
    fixtureUserKeys.push(organizer.userKey)
    const headers = TokenGenerator.authorizationHeader('organizador', { userKey: organizer.userKey })

    const tooManyCosts = Array.from({ length: 51 }, (_, index) => ({ type: 'other', description: `Custo ${index}`, amount: 10 }))
    const invalidOverrides = [
      { venue_capacity: 1000001 },
      { min_audience: 1000001, expected_audience: 1000001, max_audience: 1000001, venue_capacity: null },
      { max_audience: 1000001, venue_capacity: null },
      { internal_costs: tooManyCosts },
    ]

    for (const overrides of invalidOverrides) {
      const [status, response] = await RequestGenerator.POST_events(PayloadGenerator.createEventPayload(overrides), headers)
      assert.equal(status, 400, JSON.stringify(overrides).slice(0, 80))
      assert.equal(response.code, 'APP000001')
    }

    const [limitStatus] = await RequestGenerator.POST_events(
      PayloadGenerator.createEventPayload({ max_audience: 1000000, venue_capacity: 1000000, internal_costs: tooManyCosts.slice(0, 50) }),
      headers,
    )
    assert.equal(limitStatus, 201)
  })

  test('dia que não existe no calendário responde 400 com EVP000027', async () => {
    const organizer = await ObjectGenerator.createUserFixture({ profile: 'organizador', status: 'approved' })
    fixtureUserKeys.push(organizer.userKey)
    const headers = TokenGenerator.authorizationHeader('organizador', { userKey: organizer.userKey })

    for (const startDate of ['2026-02-31T10:00:00.000Z', '2026-04-31T10:00:00.000Z']) {
      const [status, response] = await RequestGenerator.POST_events(PayloadGenerator.createEventPayload({ start_date: startDate }), headers)
      assert.equal(status, 400, startDate)
      assert.equal(response.code, 'EVP000027')
    }
  })

  test('hora ou mês fora do intervalo responde 400 de validação', async () => {
    const organizer = await ObjectGenerator.createUserFixture({ profile: 'organizador', status: 'approved' })
    fixtureUserKeys.push(organizer.userKey)
    const headers = TokenGenerator.authorizationHeader('organizador', { userKey: organizer.userKey })

    for (const startDate of ['2026-12-10T25:00:00.000Z', '2026-13-10T10:00:00.000Z']) {
      const [status, response] = await RequestGenerator.POST_events(PayloadGenerator.createEventPayload({ start_date: startDate }), headers)
      assert.equal(status, 400, startDate)
      assert.equal(response.code, 'APP000001')
    }
  })

  test('teto de gastos ou custo próprio com mais de 2 casas decimais responde 400 sem criar o evento', async () => {
    const organizer = await ObjectGenerator.createUserFixture({ profile: 'organizador', status: 'approved' })
    fixtureUserKeys.push(organizer.userKey)
    const headers = TokenGenerator.authorizationHeader('organizador', { userKey: organizer.userKey })

    const invalidOverrides = [{ budget_limit: 0.001 }, { internal_costs: [{ type: 'tax', description: 'Taxa', amount: 10.005 }] }]
    for (const overrides of invalidOverrides) {
      const [status, response] = await RequestGenerator.POST_events(PayloadGenerator.createEventPayload(overrides), headers)
      assert.equal(status, 400, JSON.stringify(overrides))
      assert.equal(response.code, 'APP000001')
      assert.equal(response.translation, 'Valores em dinheiro aceitam no máximo 2 casas decimais.')
    }

    const [, list] = await RequestGenerator.GET_events({}, headers)
    assert.equal(list.total, 0)
  })

  test('teto de gastos é opcional e precisa ser positivo', async () => {
    const organizer = await ObjectGenerator.createUserFixture({ profile: 'organizador', status: 'approved' })
    fixtureUserKeys.push(organizer.userKey)
    const headers = TokenGenerator.authorizationHeader('organizador', { userKey: organizer.userKey })

    const [, semTeto] = await RequestGenerator.POST_events(PayloadGenerator.createEventPayload(), headers)
    const [statusComTeto, comTeto] = await RequestGenerator.POST_events(
      PayloadGenerator.createEventPayload({ budget_limit: 150000.5 }),
      headers,
    )
    const invalidos = await Promise.all(
      [0, -10, 'cem mil'].map((budget_limit) =>
        RequestGenerator.POST_events(PayloadGenerator.createEventPayload({ budget_limit }), headers),
      ),
    )

    assert.equal(semTeto.budget_limit, null)
    assert.equal(statusComTeto, 201)
    assert.equal(comTeto.budget_limit, 150000.5)
    assert.deepEqual(
      invalidos.map(([status, response]) => [status, response.code]),
      [
        [400, 'APP000001'],
        [400, 'APP000001'],
        [400, 'APP000001'],
      ],
    )
  })
})
