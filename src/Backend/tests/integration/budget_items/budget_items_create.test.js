// Testes de integração do cadastro de itens de custo em eventos.

import assert from 'node:assert/strict'
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

async function createEvent(headers) {
  const [status, event] = await RequestGenerator.POST_events(PayloadGenerator.createEventPayload({ internal_costs: [] }), headers)
  assert.equal(status, 201)
  return event
}

async function createBudgetItem(eventKey, headers, payload = PayloadGenerator.createBudgetItemPayload()) {
  return RequestGenerator.POST_event_item(eventKey, payload, headers)
}

describe('POST /events/:event_key/items', () => {
  test('organizador cadastra um item válido no próprio evento e ele fica salvo', async () => {
    const headers = await createOrganizer()
    const event = await createEvent(headers)
    const itemPayload = PayloadGenerator.createBudgetItemPayload()
    const [status, response] = await createBudgetItem(event.event_key, headers, itemPayload)

    assert.equal(status, 201)
    assert.ok(response.item_key)
    assert.equal(response.category, itemPayload.category)
    assert.equal(response.description, itemPayload.description)
    assert.equal(response.type, itemPayload.type)
    assert.equal(response.quantity, itemPayload.quantity)
    assert.equal(response.estimated_value, itemPayload.estimated_value)
    assert.equal(response.notes, itemPayload.notes)

    const storedItem = await DbUtils.getBudgetItemByKey(response.item_key)
    assert.deepEqual(storedItem, {
      item_key: response.item_key,
      event_key: event.event_key,
      category: itemPayload.category,
      description: itemPayload.description,
      type: itemPayload.type,
      quantity: itemPayload.quantity,
      estimated_value: '2500.00',
      notes: itemPayload.notes,
    })
  })
})

describe('GET /events/:event_key/items', () => {
  test('organizador lista os itens com quantidade de propostas e proposta aceita', async () => {
    const headers = await createOrganizer()
    const event = await createEvent(headers)
    const [createStatus, createdItem] = await createBudgetItem(event.event_key, headers)
    assert.equal(createStatus, 201)

    const [status, items] = await RequestGenerator.GET_event_items(event.event_key, headers)

    assert.equal(status, 200)
    assert.equal(items.length, 1)
    assert.equal(items[0].item_key, createdItem.item_key)
    assert.equal(items[0].proposals_count, 0)
    assert.equal(items[0].accepted_proposal, null)
  })
})
