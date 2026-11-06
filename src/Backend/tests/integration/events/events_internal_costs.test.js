import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { afterEach, describe, test } from 'node:test'

import { DbUtils } from '../../utils/db_utils.js'
import { ObjectGenerator } from '../../utils/object_generator.js'
import { PayloadGenerator } from '../../utils/payload_generator.js'
import { RequestGenerator } from '../../utils/request_generator.js'
import { TokenGenerator } from '../../utils/token_generator.js'

const fixtureUserKeys = []

afterEach(async () => DbUtils.deleteUserFixtures(fixtureUserKeys.splice(0)))

async function createOrganizer() {
  const organizer = await ObjectGenerator.createUserFixture({ profile: 'organizador', status: 'approved' })
  fixtureUserKeys.push(organizer.userKey)
  return TokenGenerator.authorizationHeader('organizador', { userKey: organizer.userKey })
}

async function createEventWithoutCosts(headers) {
  const [, event] = await RequestGenerator.POST_events(PayloadGenerator.createEventPayload({ internal_costs: [] }), headers)
  return event
}

const ALVARA = { type: 'tax', description: '  Alvará da prefeitura  ', amount: 1500.5 }

describe('Custos próprios do evento', () => {
  test('organizador inclui, altera e apaga um custo próprio, e o total do evento acompanha', async () => {
    const headers = await createOrganizer()
    const event = await createEventWithoutCosts(headers)

    const [createStatus, created] = await RequestGenerator.POST_event_internal_cost(event.event_key, ALVARA, headers)
    assert.equal(createStatus, 201)
    assert.equal(created.internal_costs.length, 1)
    assert.equal(created.internal_costs[0].description, 'Alvará da prefeitura')
    assert.equal(created.total_internal_cost, 1500.5)

    const costKey = created.internal_costs[0].internal_cost_key
    const [updateStatus, updated] = await RequestGenerator.PUT_event_internal_cost(
      event.event_key,
      costKey,
      { type: 'operational', description: 'Equipe de limpeza', amount: 800 },
      headers,
    )
    assert.equal(updateStatus, 200)
    assert.deepEqual(updated.internal_costs, [
      { internal_cost_key: costKey, type: 'operational', description: 'Equipe de limpeza', amount: 800 },
    ])
    assert.equal(updated.total_internal_cost, 800)

    const [deleteStatus, deleted] = await RequestGenerator.DELETE_event_internal_cost(event.event_key, costKey, headers)
    assert.equal(deleteStatus, 200)
    assert.deepEqual(deleted.internal_costs, [])
    assert.equal(deleted.total_internal_cost, 0)
  })

  test('tipo fora da lista, descrição vazia, valor negativo, acima do limite ou com mais de 2 casas respondem 400', async () => {
    const headers = await createOrganizer()
    const event = await createEventWithoutCosts(headers)
    const invalidCosts = [
      { ...ALVARA, type: 'marketing' },
      { ...ALVARA, description: '   ' },
      { ...ALVARA, amount: -1 },
      { ...ALVARA, amount: 1e11 },
      { ...ALVARA, amount: 0.001 },
      { type: 'tax', description: 'Sem valor' },
      { ...ALVARA, extra: true },
    ]

    for (const cost of invalidCosts) {
      const [status, response] = await RequestGenerator.POST_event_internal_cost(event.event_key, cost, headers)
      assert.equal(status, 400, JSON.stringify(cost))
      assert.equal(response.code, 'APP000001')
    }
  })

  test('custo de outro evento ou inexistente responde 404 com EVP000023', async () => {
    const headers = await createOrganizer()
    const event = await createEventWithoutCosts(headers)
    const otherEvent = await createEventWithoutCosts(headers)
    const [, withCost] = await RequestGenerator.POST_event_internal_cost(otherEvent.event_key, ALVARA, headers)
    const otherEventCostKey = withCost.internal_costs[0].internal_cost_key

    for (const costKey of [otherEventCostKey, randomUUID()]) {
      const [updateStatus, updateResponse] = await RequestGenerator.PUT_event_internal_cost(event.event_key, costKey, ALVARA, headers)
      const [deleteStatus, deleteResponse] = await RequestGenerator.DELETE_event_internal_cost(event.event_key, costKey, headers)
      assert.equal(updateStatus, 404)
      assert.equal(updateResponse.code, 'EVP000023')
      assert.equal(deleteStatus, 404)
      assert.equal(deleteResponse.code, 'EVP000023')
    }
  })

  test('evento de outro organizador responde 404 sem mexer nos custos dele', async () => {
    const ownerHeaders = await createOrganizer()
    const otherHeaders = await createOrganizer()
    const event = await createEventWithoutCosts(ownerHeaders)

    const [status, response] = await RequestGenerator.POST_event_internal_cost(event.event_key, ALVARA, otherHeaders)

    assert.equal(status, 404)
    assert.equal(response.code, 'EVP000013')
    const [, stored] = await RequestGenerator.GET_event_by_key(event.event_key, ownerHeaders)
    assert.deepEqual(stored.internal_costs, [])
  })

  test('evento cancelado não aceita mudar custos próprios', async () => {
    const headers = await createOrganizer()
    const event = await createEventWithoutCosts(headers)
    const [, withCost] = await RequestGenerator.POST_event_internal_cost(event.event_key, ALVARA, headers)
    const costKey = withCost.internal_costs[0].internal_cost_key
    await RequestGenerator.PATCH_event_status(event.event_key, { status: 'canceled', reason: 'Chuva.' }, headers)

    const attempts = [
      RequestGenerator.POST_event_internal_cost(event.event_key, ALVARA, headers),
      RequestGenerator.PUT_event_internal_cost(event.event_key, costKey, ALVARA, headers),
      RequestGenerator.DELETE_event_internal_cost(event.event_key, costKey, headers),
    ]
    for (const [status, response] of await Promise.all(attempts)) {
      assert.equal(status, 409)
      assert.equal(response.code, 'EVP000020')
    }
  })

  test('evento aprovado não aceita mudar custos próprios', async () => {
    const headers = await createOrganizer()
    const event = await createEventWithoutCosts(headers)
    const [, withCost] = await RequestGenerator.POST_event_internal_cost(event.event_key, ALVARA, headers)
    const costKey = withCost.internal_costs[0].internal_cost_key
    const supplier = await ObjectGenerator.createUserFixture({ profile: 'fornecedor', status: 'approved' })
    fixtureUserKeys.push(supplier.userKey)
    const item = await DbUtils.createBudgetItemFixture(event.event_key)
    await DbUtils.createProposalFixture(item.itemKey, supplier.userKey, { status: 'accepted' })
    await RequestGenerator.PATCH_event_status(event.event_key, { status: 'open_for_quotes' }, headers)
    await RequestGenerator.PATCH_event_status(event.event_key, { status: 'closed' }, headers)

    const attempts = [
      RequestGenerator.POST_event_internal_cost(event.event_key, ALVARA, headers),
      RequestGenerator.PUT_event_internal_cost(event.event_key, costKey, ALVARA, headers),
      RequestGenerator.DELETE_event_internal_cost(event.event_key, costKey, headers),
    ]
    for (const [status, response] of await Promise.all(attempts)) {
      assert.equal(status, 409)
      assert.equal(response.code, 'EVP000020')
    }
  })

  test('fornecedor recebe 403 e sem token responde 401', async () => {
    const supplier = await ObjectGenerator.createUserFixture({ profile: 'fornecedor', status: 'approved' })
    fixtureUserKeys.push(supplier.userKey)
    const supplierHeaders = TokenGenerator.authorizationHeader('fornecedor', { userKey: supplier.userKey })

    const [forbiddenStatus] = await RequestGenerator.POST_event_internal_cost(randomUUID(), ALVARA, supplierHeaders)
    const [unauthorizedStatus] = await RequestGenerator.POST_event_internal_cost(randomUUID(), ALVARA)

    assert.equal(forbiddenStatus, 403)
    assert.equal(unauthorizedStatus, 401)
  })
})
