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

    const [status, response] = await RequestGenerator.PATCH_event_status(created.event_key, { status: 'open_for_quotes' }, headers)

    assert.equal(status, 200)
    assert.equal(response.status, 'open_for_quotes')
  })

  test('publicar evento cancelado responde 409 com EVP000021', async () => {
    const organizer = await ObjectGenerator.createUserFixture({ profile: 'organizador', status: 'approved' })
    fixtureUserKeys.push(organizer.userKey)
    const headers = TokenGenerator.authorizationHeader('organizador', { userKey: organizer.userKey })

    const [, created] = await RequestGenerator.POST_events(PayloadGenerator.createEventPayload(), headers)

    await RequestGenerator.PATCH_event_status(created.event_key, { status: 'canceled', reason: 'Local indisponível.' }, headers)

    const [status2, response2] = await RequestGenerator.PATCH_event_status(created.event_key, { status: 'open_for_quotes' }, headers)
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

    const [status, response] = await RequestGenerator.PATCH_event_status(created.event_key, { status: 'open_for_quotes' }, headersB)
    assert.equal(status, 404)
    assert.equal(response.code, 'EVP000013')
  })

  test('evento segue o fluxo rascunho, cotação e encerrado', async () => {
    const organizer = await ObjectGenerator.createUserFixture({ profile: 'organizador', status: 'approved' })
    fixtureUserKeys.push(organizer.userKey)
    const headers = TokenGenerator.authorizationHeader('organizador', { userKey: organizer.userKey })
    const [, created] = await RequestGenerator.POST_events(PayloadGenerator.createEventPayload(), headers)

    for (const nextStatus of ['open_for_quotes', 'closed']) {
      const [status, response] = await RequestGenerator.PATCH_event_status(created.event_key, { status: nextStatus }, headers)
      assert.equal(status, 200)
      assert.equal(response.status, nextStatus)
    }
  })

  test('evento em rascunho ou em cotação pode ser cancelado', async () => {
    const organizer = await ObjectGenerator.createUserFixture({ profile: 'organizador', status: 'approved' })
    fixtureUserKeys.push(organizer.userKey)
    const headers = TokenGenerator.authorizationHeader('organizador', { userKey: organizer.userKey })
    const [, draft] = await RequestGenerator.POST_events(PayloadGenerator.createEventPayload(), headers)
    const [, open] = await RequestGenerator.POST_events(PayloadGenerator.createEventPayload(), headers)
    await RequestGenerator.PATCH_event_status(open.event_key, { status: 'open_for_quotes' }, headers)

    for (const event of [draft, open]) {
      const [status, response] = await RequestGenerator.PATCH_event_status(
        event.event_key,
        { status: 'canceled', reason: 'Local indisponível.' },
        headers,
      )
      assert.equal(status, 200)
      assert.equal(response.status, 'canceled')
    }
  })

  test('evento encerrado ou cancelado não muda mais de status nem volta a ser editado', async () => {
    const organizer = await ObjectGenerator.createUserFixture({ profile: 'organizador', status: 'approved' })
    fixtureUserKeys.push(organizer.userKey)
    const headers = TokenGenerator.authorizationHeader('organizador', { userKey: organizer.userKey })
    const [, closed] = await RequestGenerator.POST_events(PayloadGenerator.createEventPayload(), headers)
    await RequestGenerator.PATCH_event_status(closed.event_key, { status: 'open_for_quotes' }, headers)
    await RequestGenerator.PATCH_event_status(closed.event_key, { status: 'closed' }, headers)
    const [, canceled] = await RequestGenerator.POST_events(PayloadGenerator.createEventPayload(), headers)
    await RequestGenerator.PATCH_event_status(canceled.event_key, { status: 'canceled', reason: 'Local indisponível.' }, headers)

    for (const event of [closed, canceled]) {
      for (const nextStatus of ['draft', 'closed', 'canceled']) {
        const payload = nextStatus === 'canceled' ? { status: nextStatus, reason: 'Teste.' } : { status: nextStatus }
        const [status, response] = await RequestGenerator.PATCH_event_status(event.event_key, payload, headers)
        assert.equal(status, 409, `${event.event_key} -> ${nextStatus}`)
        assert.equal(response.code, 'EVP000026')
      }

      const [updateStatus, updateResponse] = await RequestGenerator.PUT_event_by_key(
        event.event_key,
        PayloadGenerator.createEventUpdatePayload(),
        headers,
      )
      assert.equal(updateStatus, 409)
      assert.equal(updateResponse.code, 'EVP000020')
    }
  })

  test('mudanças fora do fluxo respondem 409', async () => {
    const organizer = await ObjectGenerator.createUserFixture({ profile: 'organizador', status: 'approved' })
    fixtureUserKeys.push(organizer.userKey)
    const headers = TokenGenerator.authorizationHeader('organizador', { userKey: organizer.userKey })
    const [, draft] = await RequestGenerator.POST_events(PayloadGenerator.createEventPayload(), headers)
    const [, open] = await RequestGenerator.POST_events(PayloadGenerator.createEventPayload(), headers)
    await RequestGenerator.PATCH_event_status(open.event_key, { status: 'open_for_quotes' }, headers)

    const invalidChanges = [
      [draft, 'closed'],
      [open, 'draft'],
    ]
    for (const [event, nextStatus] of invalidChanges) {
      const [status, response] = await RequestGenerator.PATCH_event_status(event.event_key, { status: nextStatus }, headers)
      assert.equal(status, 409, nextStatus)
      assert.equal(response.code, 'EVP000026')
    }
  })

  test('pedir o mesmo status que o evento já tem responde 409 explicando isso', async () => {
    const organizer = await ObjectGenerator.createUserFixture({ profile: 'organizador', status: 'approved' })
    fixtureUserKeys.push(organizer.userKey)
    const headers = TokenGenerator.authorizationHeader('organizador', { userKey: organizer.userKey })
    const [, draft] = await RequestGenerator.POST_events(PayloadGenerator.createEventPayload(), headers)

    const [status, response] = await RequestGenerator.PATCH_event_status(draft.event_key, { status: 'draft' }, headers)

    assert.equal(status, 409)
    assert.equal(response.code, 'EVP000026')
    assert.equal(response.translation, 'O evento já está com esse status.')
  })

  test('cancelar exige motivo, que fica guardado no evento', async () => {
    const organizer = await ObjectGenerator.createUserFixture({ profile: 'organizador', status: 'approved' })
    fixtureUserKeys.push(organizer.userKey)
    const headers = TokenGenerator.authorizationHeader('organizador', { userKey: organizer.userKey })
    const [, created] = await RequestGenerator.POST_events(PayloadGenerator.createEventPayload(), headers)

    for (const payload of [
      { status: 'canceled' },
      { status: 'canceled', reason: '   ' },
      { status: 'canceled', reason: 'a'.repeat(501) },
    ]) {
      const [status, response] = await RequestGenerator.PATCH_event_status(created.event_key, payload, headers)
      assert.equal(status, 400)
      assert.equal(response.code, 'APP000001')
    }

    const [status, response] = await RequestGenerator.PATCH_event_status(
      created.event_key,
      { status: 'canceled', reason: '  Patrocinador desistiu.  ' },
      headers,
    )
    assert.equal(status, 200)
    assert.equal(response.status, 'canceled')
    assert.equal(response.cancellation_reason, 'Patrocinador desistiu.')
    assert.equal(response.is_editable, false)
  })

  test('mudanças simultâneas de status aceitam só uma', async () => {
    const organizer = await ObjectGenerator.createUserFixture({ profile: 'organizador', status: 'approved' })
    fixtureUserKeys.push(organizer.userKey)
    const headers = TokenGenerator.authorizationHeader('organizador', { userKey: organizer.userKey })
    const [, created] = await RequestGenerator.POST_events(PayloadGenerator.createEventPayload(), headers)
    await RequestGenerator.PATCH_event_status(created.event_key, { status: 'open_for_quotes' }, headers)

    const results = await Promise.all([
      RequestGenerator.PATCH_event_status(created.event_key, { status: 'closed' }, headers),
      RequestGenerator.PATCH_event_status(created.event_key, { status: 'canceled', reason: 'Chuva.' }, headers),
    ])

    assert.deepEqual(results.map(([status]) => status).sort(), [200, 409])
  })

  test('republicar evento já em cotação responde que ele já está com esse status', async () => {
    const organizer = await ObjectGenerator.createUserFixture({ profile: 'organizador', status: 'approved' })
    fixtureUserKeys.push(organizer.userKey)
    const headers = TokenGenerator.authorizationHeader('organizador', { userKey: organizer.userKey })
    const [, created] = await RequestGenerator.POST_events(PayloadGenerator.createEventPayload(), headers)
    await RequestGenerator.PATCH_event_status(created.event_key, { status: 'open_for_quotes' }, headers)

    const [status, response] = await RequestGenerator.PATCH_event_status(created.event_key, { status: 'open_for_quotes' }, headers)

    assert.equal(status, 409)
    assert.equal(response.translation, 'O evento já está com esse status.')
  })

  test('motivo junto com outro status que não seja cancelar responde 400', async () => {
    const organizer = await ObjectGenerator.createUserFixture({ profile: 'organizador', status: 'approved' })
    fixtureUserKeys.push(organizer.userKey)
    const headers = TokenGenerator.authorizationHeader('organizador', { userKey: organizer.userKey })
    const [, created] = await RequestGenerator.POST_events(PayloadGenerator.createEventPayload(), headers)

    const [status, response] = await RequestGenerator.PATCH_event_status(
      created.event_key,
      { status: 'open_for_quotes', reason: 'Sem motivo para isso.' },
      headers,
    )

    assert.equal(status, 400)
    assert.equal(response.code, 'APP000001')
  })
})
