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

describe('GET /events/:event_key (RF05)', () => {
  test('organizador consulta detalhes do seu evento existente', async () => {
    const organizer = await ObjectGenerator.createUserFixture({ profile: 'organizador', status: 'approved' })
    fixtureUserKeys.push(organizer.userKey)
    const headers = TokenGenerator.authorizationHeader('organizador', { userKey: organizer.userKey })

    const [, created] = await RequestGenerator.POST_events(PayloadGenerator.createEventPayload(), headers)
    const [status, response] = await RequestGenerator.GET_event_by_key(created.event_key, headers)

    assert.equal(status, 200)
    assert.equal(response.event_key, created.event_key)
    assert.equal(response.name, created.name)
    assert.ok(Array.isArray(response.internal_costs))
    assert.equal(response.internal_costs.length, 2)
  })

  test('tentativa de consultar evento de outro organizador responde 404 (EVP000013)', async () => {
    const organizerA = await ObjectGenerator.createUserFixture({ profile: 'organizador', status: 'approved' })
    const organizerB = await ObjectGenerator.createUserFixture({ profile: 'organizador', status: 'approved' })
    fixtureUserKeys.push(organizerA.userKey, organizerB.userKey)

    const headersA = TokenGenerator.authorizationHeader('organizador', { userKey: organizerA.userKey })
    const headersB = TokenGenerator.authorizationHeader('organizador', { userKey: organizerB.userKey })

    const [, created] = await RequestGenerator.POST_events(PayloadGenerator.createEventPayload(), headersA)
    const [status, response] = await RequestGenerator.GET_event_by_key(created.event_key, headersB)

    assert.equal(status, 404)
    assert.equal(response.code, 'EVP000013')
    assert.equal(response.translation, 'O evento não foi encontrado.')
  })

  test('chave inexistente responde 404 (EVP000013)', async () => {
    const organizer = await ObjectGenerator.createUserFixture({ profile: 'organizador', status: 'approved' })
    fixtureUserKeys.push(organizer.userKey)
    const headers = TokenGenerator.authorizationHeader('organizador', { userKey: organizer.userKey })

    const [status, response] = await RequestGenerator.GET_event_by_key(randomUUID(), headers)
    assert.equal(status, 404)
    assert.equal(response.code, 'EVP000013')
  })
})
