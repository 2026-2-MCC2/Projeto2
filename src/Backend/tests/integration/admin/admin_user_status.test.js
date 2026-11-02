// Testes de integração da decisão administrativa de status de usuários.

import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { afterEach, describe, test } from 'node:test'

import { DbUtils } from '../../utils/db_utils.js'
import { ObjectGenerator } from '../../utils/object_generator.js'
import { RequestGenerator } from '../../utils/request_generator.js'
import { TokenGenerator } from '../../utils/token_generator.js'

const fixtureUserKeys = []

afterEach(async () => {
  await DbUtils.deleteUserFixtures(fixtureUserKeys.splice(0))
})

async function createFixture(options) {
  const user = await ObjectGenerator.createUserFixture(options)
  fixtureUserKeys.push(user.userKey)
  return user
}

function adminHeaders(admin) {
  return TokenGenerator.authorizationHeader('admin', { userKey: admin.userKey })
}

describe('Admin user status', () => {
  test('admin aprova um organizador pendente e registra a decisão sem expor dados sensíveis', async () => {
    const admin = await createFixture({ profile: 'admin', status: 'approved' })
    const target = await createFixture({ profile: 'organizador', status: 'pending' })

    const [status, response] = await RequestGenerator.PUT_admin_user_status(target.userKey, { status: 'approved' }, adminHeaders(admin))

    assert.equal(status, 202)
    assert.equal(response.user_key, target.userKey)
    assert.equal(response.status, 'approved')
    assert.equal(Object.hasOwn(response, 'password_hash'), false)
    assert.equal(Object.hasOwn(response, 'id'), false)

    const storedUser = await DbUtils.getUserFixture(target.userKey)
    assert.equal(storedUser.status, 'approved')
    assert.ok(storedUser.approved_at)

    const [decision] = await DbUtils.getUserStatusHistory(target.userKey)
    assert.equal(decision.old_status, 'pending')
    assert.equal(decision.new_status, 'approved')
    assert.equal(decision.admin_user_key, admin.userKey)
    assert.ok(decision.event_datetime)
  })

  test('admin rejeita um fornecedor pendente e registra a decisão', async () => {
    const admin = await createFixture({ profile: 'admin', status: 'approved' })
    const target = await createFixture({ profile: 'fornecedor', status: 'pending' })

    const [status, response] = await RequestGenerator.PUT_admin_user_status(target.userKey, { status: 'rejected' }, adminHeaders(admin))

    assert.equal(status, 202)
    assert.equal(response.status, 'rejected')

    const storedUser = await DbUtils.getUserFixture(target.userKey)
    assert.equal(storedUser.status, 'rejected')
    assert.equal(storedUser.approved_at, null)

    const [decision] = await DbUtils.getUserStatusHistory(target.userKey)
    assert.equal(decision.old_status, 'pending')
    assert.equal(decision.new_status, 'rejected')
    assert.equal(decision.admin_user_key, admin.userKey)
  })

  test('body inválido responde 400', async () => {
    const admin = await createFixture({ profile: 'admin', status: 'approved' })
    const target = await createFixture({ profile: 'organizador', status: 'pending' })

    const [status, response] = await RequestGenerator.PUT_admin_user_status(target.userKey, { status: 'pending' }, adminHeaders(admin))

    assert.equal(status, 400)
    assert.equal(response.code, 'APP000001')
  })

  test('token ausente responde 401', async () => {
    const [status, response] = await RequestGenerator.PUT_admin_user_status(randomUUID(), { status: 'approved' })

    assert.equal(status, 401)
    assert.equal(response.code, 'APP000401')
  })

  test('token inválido responde 401', async () => {
    const [status, response] = await RequestGenerator.PUT_admin_user_status(
      randomUUID(),
      { status: 'approved' },
      { Authorization: 'Bearer token.falsificado.123' },
    )

    assert.equal(status, 401)
    assert.equal(response.code, 'APP000401')
  })

  test('perfil diferente de admin responde 403 mesmo com body inválido', async () => {
    const organizer = await createFixture({ profile: 'organizador', status: 'approved' })
    const target = await createFixture({ profile: 'fornecedor', status: 'pending' })
    const headers = TokenGenerator.authorizationHeader('organizador', { userKey: organizer.userKey })

    const [status, response] = await RequestGenerator.PUT_admin_user_status(target.userKey, { status: 'pending' }, headers)

    assert.equal(status, 403)
    assert.equal(response.code, 'APP000403')
  })

  test('usuário inexistente responde 404', async () => {
    const admin = await createFixture({ profile: 'admin', status: 'approved' })
    const [status, response] = await RequestGenerator.PUT_admin_user_status(randomUUID(), { status: 'approved' }, adminHeaders(admin))

    assert.equal(status, 404)
    assert.equal(response.code, 'EVP000003')
  })

  test('usuário que já não está pendente responde 409', async () => {
    const admin = await createFixture({ profile: 'admin', status: 'approved' })
    const target = await createFixture({ profile: 'organizador', status: 'approved' })

    const [status, response] = await RequestGenerator.PUT_admin_user_status(target.userKey, { status: 'rejected' }, adminHeaders(admin))

    assert.equal(status, 409)
    assert.equal(response.code, 'EVP000004')
  })

  test('usuário com perfil admin não pode ser decidido por esta rota', async () => {
    const admin = await createFixture({ profile: 'admin', status: 'approved' })
    const targetAdmin = await createFixture({ profile: 'admin', status: 'pending' })

    const [status, response] = await RequestGenerator.PUT_admin_user_status(
      targetAdmin.userKey,
      { status: 'approved' },
      adminHeaders(admin),
    )

    assert.equal(status, 409)
    assert.equal(response.code, 'EVP000004')
  })

  test('decisões simultâneas sobre o mesmo usuário aceitam somente uma', async () => {
    const admin = await createFixture({ profile: 'admin', status: 'approved' })
    const target = await createFixture({ profile: 'fornecedor', status: 'pending' })
    const headers = adminHeaders(admin)

    const results = await Promise.all([
      RequestGenerator.PUT_admin_user_status(target.userKey, { status: 'approved' }, headers),
      RequestGenerator.PUT_admin_user_status(target.userKey, { status: 'rejected' }, headers),
    ])

    assert.deepEqual(results.map(([status]) => status).sort(), [202, 409])
  })
})
