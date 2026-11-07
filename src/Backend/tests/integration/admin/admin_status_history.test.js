import assert from 'node:assert/strict'
import { afterEach, describe, test } from 'node:test'

import { DbUtils } from '../../utils/db_utils.js'
import { ObjectGenerator } from '../../utils/object_generator.js'
import { RequestGenerator } from '../../utils/request_generator.js'
import { TokenGenerator } from '../../utils/token_generator.js'

const fixtureUserKeys = []

afterEach(async () => DbUtils.deleteUserFixtures(fixtureUserKeys.splice(0)))

async function createFixture(options) {
  const user = await ObjectGenerator.createUserFixture(options)
  fixtureUserKeys.push(user.userKey)
  return user
}

const headersOf = (profile, user) => TokenGenerator.authorizationHeader(profile, { userKey: user.userKey })

describe('GET /admin/status-history', () => {
  test('lista as decisões do admin da mais recente para a mais antiga, com quem decidiu e o motivo', async () => {
    const admin = await createFixture({ profile: 'admin', status: 'approved', name: 'Admin do Histórico' })
    const target = await createFixture({ profile: 'fornecedor', status: 'pending', name: 'Fornecedor do Histórico' })
    const headers = headersOf('admin', admin)
    await RequestGenerator.PUT_admin_user_status(target.userKey, { status: 'approved' }, headers)
    await RequestGenerator.PUT_admin_user_status(target.userKey, { status: 'blocked', reason: 'Documentação vencida' }, headers)

    const [status, response] = await RequestGenerator.GET_admin_status_history({ limit: 100 }, headers)

    assert.equal(status, 200)
    const doAlvo = response.data.filter((event) => event.user_key === target.userKey)
    assert.deepEqual(
      doAlvo.map(({ decided_at, ...event }) => event),
      [
        {
          user_key: target.userKey,
          name: 'Fornecedor do Histórico',
          email: doAlvo[0].email,
          profile: 'fornecedor',
          old_status: 'approved',
          new_status: 'blocked',
          reason: 'Documentação vencida',
          admin_name: 'Admin do Histórico',
        },
        {
          user_key: target.userKey,
          name: 'Fornecedor do Histórico',
          email: doAlvo[1].email,
          profile: 'fornecedor',
          old_status: 'pending',
          new_status: 'approved',
          reason: null,
          admin_name: 'Admin do Histórico',
        },
      ],
    )
    assert.ok(!Number.isNaN(Date.parse(doAlvo[0].decided_at)))
    assert.equal('id' in doAlvo[0], false)
  })

  test('pagina com limit e page', async () => {
    const admin = await createFixture({ profile: 'admin', status: 'approved' })
    const target = await createFixture({ profile: 'organizador', status: 'pending' })
    const headers = headersOf('admin', admin)
    await RequestGenerator.PUT_admin_user_status(target.userKey, { status: 'approved' }, headers)
    await RequestGenerator.PUT_admin_user_status(target.userKey, { status: 'blocked', reason: 'Teste' }, headers)

    const [status, response] = await RequestGenerator.GET_admin_status_history({ limit: 1, page: 0 }, headers)

    assert.equal(status, 200)
    assert.equal(response.data.length, 1)
    assert.equal(response.is_last_page, false)
  })

  test('organizador e fornecedor recebem 403 e sem token 401', async () => {
    const organizer = await createFixture({ profile: 'organizador', status: 'approved' })
    const supplier = await createFixture({ profile: 'fornecedor', status: 'approved' })

    const [organizerStatus] = await RequestGenerator.GET_admin_status_history({}, headersOf('organizador', organizer))
    const [supplierStatus] = await RequestGenerator.GET_admin_status_history({}, headersOf('fornecedor', supplier))
    const [anonymousStatus] = await RequestGenerator.GET_admin_status_history()

    assert.equal(organizerStatus, 403)
    assert.equal(supplierStatus, 403)
    assert.equal(anonymousStatus, 401)
  })
})
