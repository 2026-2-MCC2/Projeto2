// o banco pode ter outros cadastros, então os testes conferem só os que eles mesmos criam

import assert from 'node:assert/strict'
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

async function listAllPages(params, headers) {
  const items = []
  for (let page = 0; ; page++) {
    const [status, response] = await RequestGenerator.GET_admin_users({ ...params, limit: 100, page }, headers)
    assert.equal(status, 200)
    items.push(...response.data)
    if (response.is_last_page) {
      return items
    }
  }
}

describe('GET /admin/users', () => {
  test('admin lista os pendentes com os dados do organizer e do supplier, sem dados sensíveis', async () => {
    const admin = await createFixture({ profile: 'admin', status: 'approved' })
    const organizer = await createFixture({ profile: 'organizador', status: 'pending' })
    const supplier = await createFixture({ profile: 'fornecedor', status: 'pending' })
    const approved = await createFixture({ profile: 'organizador', status: 'approved' })

    const items = await listAllPages({ status: 'pending' }, adminHeaders(admin))
    const keys = items.map((item) => item.user_key)

    assert.ok(keys.includes(organizer.userKey))
    assert.ok(keys.includes(supplier.userKey))
    assert.equal(keys.includes(approved.userKey), false)
    assert.ok(items.every((item) => item.status === 'pending'))
    assert.ok(items.every((item) => item.profile !== 'admin'))

    const organizerItem = items.find((item) => item.user_key === organizer.userKey)
    assert.deepEqual(Object.keys(organizerItem).sort(), [
      'categories',
      'cnpj',
      'created_at',
      'email',
      'name',
      'phone',
      'profile',
      'status',
      'user_key',
    ])
    assert.equal(organizerItem.profile, 'organizador')
    assert.match(organizerItem.cnpj, /^\d{14}$/)
    assert.equal(organizerItem.phone, '11999999999')
    assert.equal(organizerItem.categories, null)

    const supplierItem = items.find((item) => item.user_key === supplier.userKey)
    assert.equal(supplierItem.profile, 'fornecedor')
    assert.match(supplierItem.cnpj, /^\d{14}$/)
    assert.equal(supplierItem.phone, '11999999999')
    assert.deepEqual(supplierItem.categories, ['Estrutura', 'Segurança'])
  })

  test('lista do cadastro mais antigo para o mais novo', async () => {
    const admin = await createFixture({ profile: 'admin', status: 'approved' })
    const older = await createFixture({ profile: 'organizador', status: 'pending' })
    const newer = await createFixture({ profile: 'fornecedor', status: 'pending' })

    const items = await listAllPages({ status: 'pending' }, adminHeaders(admin))
    const keys = items.map((item) => item.user_key)

    assert.ok(keys.indexOf(older.userKey) < keys.indexOf(newer.userKey))
    const dates = items.map((item) => new Date(item.created_at).getTime())
    assert.deepEqual(
      dates,
      [...dates].sort((a, b) => a - b),
    )
  })

  test('filtra por status e, sem status, traz todos os status (menos admins)', async () => {
    const admin = await createFixture({ profile: 'admin', status: 'approved' })
    const pending = await createFixture({ profile: 'organizador', status: 'pending' })
    const rejected = await createFixture({ profile: 'fornecedor', status: 'rejected' })
    const headers = adminHeaders(admin)

    const rejectedItems = await listAllPages({ status: 'rejected' }, headers)
    assert.ok(rejectedItems.some((item) => item.user_key === rejected.userKey))
    assert.ok(rejectedItems.every((item) => item.status === 'rejected'))

    const allItems = await listAllPages({}, headers)
    const allKeys = allItems.map((item) => item.user_key)
    assert.ok(allKeys.includes(pending.userKey))
    assert.ok(allKeys.includes(rejected.userKey))
    assert.equal(allKeys.includes(admin.userKey), false)
  })

  test('paginação busca um a mais para indicar a próxima página', async () => {
    const admin = await createFixture({ profile: 'admin', status: 'approved' })
    await createFixture({ profile: 'organizador', status: 'pending' })
    await createFixture({ profile: 'fornecedor', status: 'pending' })
    const headers = adminHeaders(admin)

    const [firstStatus, firstPage] = await RequestGenerator.GET_admin_users({ status: 'pending', limit: 1, page: 0 }, headers)
    assert.equal(firstStatus, 200)
    assert.equal(firstPage.data.length, 1)
    assert.equal(firstPage.limit, 1)
    assert.equal(firstPage.page, 0)
    assert.equal(firstPage.is_last_page, false)

    const [secondStatus, secondPage] = await RequestGenerator.GET_admin_users({ status: 'pending', limit: 1, page: 1 }, headers)
    assert.equal(secondStatus, 200)
    assert.equal(secondPage.data.length, 1)
    assert.notEqual(secondPage.data[0].user_key, firstPage.data[0].user_key)

    const [farStatus, farPage] = await RequestGenerator.GET_admin_users({ status: 'pending', limit: 100, page: 1000 }, headers)
    assert.equal(farStatus, 200)
    assert.deepEqual(farPage.data, [])
    assert.equal(farPage.is_last_page, true)
  })

  test('status inválido responde 400', async () => {
    const admin = await createFixture({ profile: 'admin', status: 'approved' })

    const [status, response] = await RequestGenerator.GET_admin_users({ status: 'aprovado' }, adminHeaders(admin))

    assert.equal(status, 400)
    assert.equal(response.code, 'APP000010')
  })

  test('limit acima de 100 responde 400', async () => {
    const admin = await createFixture({ profile: 'admin', status: 'approved' })

    const [status, response] = await RequestGenerator.GET_admin_users({ limit: 101 }, adminHeaders(admin))

    assert.equal(status, 400)
    assert.equal(response.code, 'APP000010')
  })

  test('organizador e fornecedor aprovados recebem 403', async () => {
    for (const profile of ['organizador', 'fornecedor']) {
      const user = await createFixture({ profile, status: 'approved' })
      const headers = TokenGenerator.authorizationHeader(profile, { userKey: user.userKey })

      const [status, response] = await RequestGenerator.GET_admin_users({ status: 'pending' }, headers)

      assert.equal(status, 403)
      assert.equal(response.code, 'APP000403')
    }
  })

  test('sem token responde 401', async () => {
    const [status, response] = await RequestGenerator.GET_admin_users({ status: 'pending' })

    assert.equal(status, 401)
    assert.equal(response.code, 'APP000401')
  })
})
