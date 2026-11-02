import assert from 'node:assert/strict'
import { afterEach, describe, test } from 'node:test'

import { DbUtils } from '../../utils/db_utils.js'
import { ObjectGenerator } from '../../utils/object_generator.js'
import { PayloadGenerator } from '../../utils/payload_generator.js'
import { RequestGenerator } from '../../utils/request_generator.js'
import { TokenGenerator } from '../../utils/token_generator.js'

const fixtureUserKeys = []

afterEach(async () => DbUtils.deleteUserFixtures(fixtureUserKeys.splice(0)))

describe('GET /events (RF05)', () => {
  test('organizador lista apenas os seus eventos (isolamento de tenant)', async () => {
    const organizerA = await ObjectGenerator.createUserFixture({ profile: 'organizador', status: 'approved' })
    const organizerB = await ObjectGenerator.createUserFixture({ profile: 'organizador', status: 'approved' })
    fixtureUserKeys.push(organizerA.userKey, organizerB.userKey)

    const headersA = TokenGenerator.authorizationHeader('organizador', { userKey: organizerA.userKey })
    const headersB = TokenGenerator.authorizationHeader('organizador', { userKey: organizerB.userKey })

    await RequestGenerator.POST_events(PayloadGenerator.createEventPayload({ name: 'Evento Exclusivo de A' }), headersA)
    await RequestGenerator.POST_events(PayloadGenerator.createEventPayload({ name: 'Evento Exclusivo de B' }), headersB)

    const [statusA, responseA] = await RequestGenerator.GET_events({}, headersA)
    assert.equal(statusA, 200)
    assert.ok(Array.isArray(responseA.data))
    assert.equal(responseA.data.length, 1)
    assert.equal(responseA.data[0].name, 'Evento Exclusivo de A')

    const [statusB, responseB] = await RequestGenerator.GET_events({}, headersB)
    assert.equal(statusB, 200)
    assert.equal(responseB.data.length, 1)
    assert.equal(responseB.data[0].name, 'Evento Exclusivo de B')
  })

  test('filtra por status e busca por texto no nome e local', async () => {
    const organizer = await ObjectGenerator.createUserFixture({ profile: 'organizador', status: 'approved' })
    fixtureUserKeys.push(organizer.userKey)
    const headers = TokenGenerator.authorizationHeader('organizador', { userKey: organizer.userKey })

    await RequestGenerator.POST_events(
      PayloadGenerator.createEventPayload({ name: 'Festival Rock Paulista', city: 'São Paulo' }),
      headers,
    )
    await RequestGenerator.POST_events(
      PayloadGenerator.createEventPayload({ name: 'Congresso de Tecnologia', city: 'Campinas' }),
      headers,
    )

    // Busca textual
    const [statusBusca, responseBusca] = await RequestGenerator.GET_events({ search: 'Rock' }, headers)
    assert.equal(statusBusca, 200)
    assert.equal(responseBusca.data.length, 1)
    assert.equal(responseBusca.data[0].name, 'Festival Rock Paulista')

    // Filtro por status
    const [statusFiltro, responseFiltro] = await RequestGenerator.GET_events({ status: 'draft' }, headers)
    assert.equal(statusFiltro, 200)
    assert.equal(responseFiltro.data.length, 2)
  })

  test('suporta paginação com limit e page', async () => {
    const organizer = await ObjectGenerator.createUserFixture({ profile: 'organizador', status: 'approved' })
    fixtureUserKeys.push(organizer.userKey)
    const headers = TokenGenerator.authorizationHeader('organizador', { userKey: organizer.userKey })

    for (let i = 1; i <= 3; i++) {
      await RequestGenerator.POST_events(PayloadGenerator.createEventPayload({ name: `Evento ${i}` }), headers)
    }

    const [status, response] = await RequestGenerator.GET_events({ limit: 2, page: 0 }, headers)
    assert.equal(status, 200)
    assert.equal(response.data.length, 2)
    assert.equal(response.total, 3)
    assert.equal(response.is_last_page, false)
  })

  test('sem token responde 401', async () => {
    const [status, response] = await RequestGenerator.GET_events()
    assert.equal(status, 401)
    assert.equal(response.code, 'APP000401')
  })
})
