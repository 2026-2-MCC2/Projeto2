import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { afterEach, describe, test } from 'node:test'

import { DbUtils } from '../../utils/db_utils.js'
import { Mailpit } from '../../utils/mailpit.js'
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

describe('POST /admin/users/:user_key/redefinicao-de-senha', () => {
  test('admin envia o link de redefinição para um usuário aprovado', async () => {
    const admin = await createFixture({ profile: 'admin', status: 'approved' })
    const target = await createFixture({ profile: 'fornecedor', status: 'approved' })

    const [status, response] = await RequestGenerator.POST_admin_user_password_reset(target.userKey, adminHeaders(admin))

    assert.equal(status, 202)
    assert.equal(response, null)

    const email = await Mailpit.waitForEmailTo(target.email)
    assert.equal(email.subject, 'Redefinição de senha do TrocaTicket')
    assert.ok(Mailpit.extractResetToken(email))
    assert.equal((await DbUtils.getPasswordResetTokens(target.userKey)).length, 1)
  })

  test('usuário que não está aprovado ou que é admin responde 409, sem e-mail', async () => {
    const admin = await createFixture({ profile: 'admin', status: 'approved' })
    const targets = [
      await createFixture({ profile: 'organizador', status: 'pending' }),
      await createFixture({ profile: 'organizador', status: 'blocked' }),
      await createFixture({ profile: 'admin', status: 'approved' }),
    ]

    for (const target of targets) {
      const [status, response] = await RequestGenerator.POST_admin_user_password_reset(target.userKey, adminHeaders(admin))
      assert.equal(status, 409)
      assert.equal(response.code, 'EVP000004')
    }

    for (const target of targets) {
      assert.equal(await Mailpit.countEmailsAfterWaiting(target.email, 500), 0)
    }
  })

  test('usuário inexistente responde 404', async () => {
    const admin = await createFixture({ profile: 'admin', status: 'approved' })

    const [status, response] = await RequestGenerator.POST_admin_user_password_reset(randomUUID(), adminHeaders(admin))

    assert.equal(status, 404)
    assert.equal(response.code, 'EVP000003')
  })

  test('perfil diferente de admin responde 403 e sem token responde 401', async () => {
    const organizer = await createFixture({ profile: 'organizador', status: 'approved' })
    const target = await createFixture({ profile: 'fornecedor', status: 'approved' })
    const organizerHeaders = TokenGenerator.authorizationHeader('organizador', { userKey: organizer.userKey })

    const [forbiddenStatus] = await RequestGenerator.POST_admin_user_password_reset(target.userKey, organizerHeaders)
    const [unauthorizedStatus] = await RequestGenerator.POST_admin_user_password_reset(target.userKey)

    assert.equal(forbiddenStatus, 403)
    assert.equal(unauthorizedStatus, 401)
  })
})
