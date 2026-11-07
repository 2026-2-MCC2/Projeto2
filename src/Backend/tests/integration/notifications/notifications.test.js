import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { afterEach, describe, test } from 'node:test'

import { DbUtils } from '../../utils/db_utils.js'
import { ObjectGenerator } from '../../utils/object_generator.js'
import { RequestGenerator } from '../../utils/request_generator.js'
import { TokenGenerator } from '../../utils/token_generator.js'

const fixtureUserKeys = []

afterEach(async () => DbUtils.deleteUserFixtures(fixtureUserKeys.splice(0)))

async function createUser(profile) {
  const user = await ObjectGenerator.createUserFixture({ profile, status: 'approved' })
  fixtureUserKeys.push(user.userKey)
  return { user, headers: TokenGenerator.authorizationHeader(profile, { userKey: user.userKey }) }
}

describe('GET /notifications', () => {
  test('lista só as notificações do usuário, da mais recente para a mais antiga, com o total de não lidas', async () => {
    const { user, headers } = await createUser('organizador')
    const other = await createUser('organizador')
    const keys = await DbUtils.createNotificationFixtures(user.userKey, 3)
    await DbUtils.createNotificationFixtures(other.user.userKey, 2)

    const [status, response] = await RequestGenerator.GET_notifications({}, headers)

    assert.equal(status, 200)
    assert.deepEqual(
      response.data.map((notification) => notification.notification_key),
      [...keys].reverse(),
    )
    assert.equal(response.unread_count, 3)
    assert.equal(response.next_cursor, null)
    const [newest] = response.data
    assert.deepEqual(Object.keys(newest).sort(), ['body', 'created_at', 'link', 'notification_key', 'read', 'title', 'type'])
    assert.equal(newest.title, 'Notificação 3')
    assert.equal(newest.read, false)
    assert.ok(!Number.isNaN(Date.parse(newest.created_at)))
  })

  test('pagina pelo cursor sem repetir nem pular notificações', async () => {
    const { user, headers } = await createUser('fornecedor')
    const keys = (await DbUtils.createNotificationFixtures(user.userKey, 5)).reverse()

    const [, firstPage] = await RequestGenerator.GET_notifications({ limit: 2 }, headers)
    const [, secondPage] = await RequestGenerator.GET_notifications({ limit: 2, after: firstPage.next_cursor }, headers)
    const [, lastPage] = await RequestGenerator.GET_notifications({ limit: 2, after: secondPage.next_cursor }, headers)

    const pages = [firstPage, secondPage, lastPage].map((page) => page.data.map((notification) => notification.notification_key))
    assert.deepEqual(pages, [keys.slice(0, 2), keys.slice(2, 4), keys.slice(4)])
    assert.notEqual(firstPage.next_cursor, null)
    assert.equal(lastPage.next_cursor, null)
    assert.equal(lastPage.unread_count, 5)
  })

  test('recusa cursor inválido', async () => {
    const { headers } = await createUser('organizador')

    const [status, response] = await RequestGenerator.GET_notifications({ after: 'nao-e-um-cursor' }, headers)

    assert.equal(status, 400)
    assert.equal(response.code, 'APP000010')
  })

  test('admin também tem as próprias notificações', async () => {
    const { headers } = await createUser('admin')

    const [status, response] = await RequestGenerator.GET_notifications({}, headers)

    assert.equal(status, 200)
    assert.deepEqual(response, { data: [], unread_count: 0, next_cursor: null })
  })

  test('sem login responde 401', async () => {
    const [status] = await RequestGenerator.GET_notifications()

    assert.equal(status, 401)
  })
})

describe('PATCH /notifications/:notification_key/read', () => {
  test('marca uma notificação como lida', async () => {
    const { user, headers } = await createUser('organizador')
    const [first, second] = await DbUtils.createNotificationFixtures(user.userKey, 2)

    const [status] = await RequestGenerator.PATCH_notification_read(first, headers)
    const [againStatus] = await RequestGenerator.PATCH_notification_read(first, headers)

    assert.equal(status, 204)
    assert.equal(againStatus, 204)
    const [, response] = await RequestGenerator.GET_notifications({}, headers)
    assert.equal(response.unread_count, 1)
    assert.equal(response.data.find((notification) => notification.notification_key === first).read, true)
    assert.equal(response.data.find((notification) => notification.notification_key === second).read, false)
  })

  test('notificação de outro usuário ou inexistente responde 404', async () => {
    const { headers } = await createUser('organizador')
    const other = await createUser('organizador')
    const [othersKey] = await DbUtils.createNotificationFixtures(other.user.userKey, 1)

    const [status, response] = await RequestGenerator.PATCH_notification_read(othersKey, headers)
    const [unknownStatus] = await RequestGenerator.PATCH_notification_read(randomUUID(), headers)

    assert.equal(status, 404)
    assert.equal(response.code, 'EVP000051')
    assert.equal(unknownStatus, 404)
    const [, othersList] = await RequestGenerator.GET_notifications({}, other.headers)
    assert.equal(othersList.unread_count, 1)
  })
})

describe('POST /notifications/read-all', () => {
  test('marca todas as notificações do usuário como lidas, sem mexer nas dos outros', async () => {
    const { user, headers } = await createUser('fornecedor')
    const other = await createUser('fornecedor')
    await DbUtils.createNotificationFixtures(user.userKey, 3)
    await DbUtils.createNotificationFixtures(other.user.userKey, 1)

    const [status] = await RequestGenerator.POST_notifications_read_all(headers)

    assert.equal(status, 204)
    const [, response] = await RequestGenerator.GET_notifications({}, headers)
    assert.equal(response.unread_count, 0)
    assert.ok(response.data.every((notification) => notification.read))
    const [, othersList] = await RequestGenerator.GET_notifications({}, other.headers)
    assert.equal(othersList.unread_count, 1)
  })
})
