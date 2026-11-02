import assert from 'node:assert/strict'
import { afterEach, describe, test } from 'node:test'

import { DbUtils } from '../../utils/db_utils.js'
import { ObjectGenerator } from '../../utils/object_generator.js'
import { PayloadGenerator } from '../../utils/payload_generator.js'
import { RequestGenerator } from '../../utils/request_generator.js'
import { TokenGenerator } from '../../utils/token_generator.js'

const fixtureUserKeys = []

afterEach(async () => DbUtils.deleteUserFixtures(fixtureUserKeys.splice(0)))

describe('PATCH /events/:event_key/status (RF08 - Publicação para cotação)', () => {
  test('validação de schema: status inválido ou campo extra responde 400', async () => {
    const organizer = await ObjectGenerator.createUserFixture({ profile: 'organizador', status: 'approved' })
    fixtureUserKeys.push(organizer.userKey)
    const headers = TokenGenerator.authorizationHeader('organizador', { userKey: organizer.userKey })

    const [, created] = await RequestGenerator.POST_events(PayloadGenerator.createEventPayload(), headers)

    // Status fora do enum
    const [statusInvalido, respInvalido] = await RequestGenerator.PATCH_event_status(
      created.event_key,
      { status: 'status_inexistente' },
      headers,
    )
    assert.equal(statusInvalido, 400)
    assert.equal(respInvalido.code, 'APP000001')

    // Campo extra
    const [statusExtra, respExtra] = await RequestGenerator.PATCH_event_status(
      created.event_key,
      { status: 'open_for_quotes', campo_extra: true },
      headers,
    )
    assert.equal(statusExtra, 400)
    assert.equal(respExtra.code, 'APP000001')
  })

  test('organizador publica evento em rascunho para cotação', async () => {
    const organizer = await ObjectGenerator.createUserFixture({ profile: 'organizador', status: 'approved' })
    fixtureUserKeys.push(organizer.userKey)
    const headers = TokenGenerator.authorizationHeader('organizador', { userKey: organizer.userKey })

    const [, created] = await RequestGenerator.POST_events(PayloadGenerator.createEventPayload(), headers)

    const [status, response] = await RequestGenerator.PATCH_event_status(
      created.event_key,
      { status: 'open_for_quotes' },
      headers,
    )

    assert.equal(status, 200)
    assert.equal(response.status, 'open_for_quotes')
  })

  test('tentativa de publicar evento que já não está em rascunho responde 409 com EVP000021', async () => {
    const organizer = await ObjectGenerator.createUserFixture({ profile: 'organizador', status: 'approved' })
    fixtureUserKeys.push(organizer.userKey)
    const headers = TokenGenerator.authorizationHeader('organizador', { userKey: organizer.userKey })

    const [, created] = await RequestGenerator.POST_events(PayloadGenerator.createEventPayload(), headers)

    // Publica pela primeira vez (draft -> open_for_quotes)
    await RequestGenerator.PATCH_event_status(created.event_key, { status: 'open_for_quotes' }, headers)

    // Segunda publicação do mesmo evento: conflito
    const [status2, response2] = await RequestGenerator.PATCH_event_status(
      created.event_key,
      { status: 'open_for_quotes' },
      headers,
    )
    assert.equal(status2, 409)
    assert.equal(response2.code, 'EVP000021')
    assert.equal(response2.translation, 'Apenas eventos em rascunho podem ser publicados para cotação.')
  })

  test('tentativa de publicar evento de outro organizador responde 404 (EVP000013)', async () => {
    const organizerA = await ObjectGenerator.createUserFixture({ profile: 'organizador', status: 'approved' })
    const organizerB = await ObjectGenerator.createUserFixture({ profile: 'organizador', status: 'approved' })
    fixtureUserKeys.push(organizerA.userKey, organizerB.userKey)

    const headersA = TokenGenerator.authorizationHeader('organizador', { userKey: organizerA.userKey })
    const headersB = TokenGenerator.authorizationHeader('organizador', { userKey: organizerB.userKey })

    const [, created] = await RequestGenerator.POST_events(PayloadGenerator.createEventPayload(), headersA)

    const [status, response] = await RequestGenerator.PATCH_event_status(
      created.event_key,
      { status: 'open_for_quotes' },
      headersB,
    )
    assert.equal(status, 404)
    assert.equal(response.code, 'EVP000013')
  })
})
