import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { afterEach, before, describe, test } from 'node:test'
import { setTimeout as sleep } from 'node:timers/promises'

import { SecurityTools } from '../../src/utils/security_tools.js'
import { DbUtils } from '../utils/db_utils.js'
import { Mailpit } from '../utils/mailpit.js'
import { ObjectGenerator } from '../utils/object_generator.js'
import { RequestGenerator } from '../utils/request_generator.js'

const PASSWORD = 'senhaForte123'
const NEW_PASSWORD = 'novaSenhaForte456'
const fixtureUserKeys = []
let passwordHash

before(async () => {
  passwordHash = await SecurityTools.hashPassword(PASSWORD)
})

afterEach(async () => {
  await DbUtils.deleteUserFixtures(fixtureUserKeys.splice(0))
})

async function createFixture(options) {
  const user = await ObjectGenerator.createUserFixture({ passwordHash, ...options })
  fixtureUserKeys.push(user.userKey)
  return user
}

const sha256 = (text) => createHash('sha256').update(text).digest('hex')

describe('POST /auth/esqueci-senha', () => {
  test('usuário aprovado recebe o link de redefinição e o banco guarda só o hash do token', async () => {
    const user = await createFixture({ profile: 'organizador', status: 'approved' })

    const [status, response] = await RequestGenerator.POST_auth_esqueci_senha({ email: `  ${user.email.toUpperCase()} ` })

    assert.equal(status, 202)
    assert.equal(response, null)

    const email = await Mailpit.waitForEmailTo(user.email)
    assert.match(email.subject, /redefini/i)
    assert.match(email.text, /http:\/\/localhost:5173\/redefinir-senha\?token=/)
    assert.match(email.text, /1 hora/)
    assert.match(email.html, /RF03 Test User/)

    const token = Mailpit.extractResetToken(email)
    const [storedToken] = await DbUtils.getPasswordResetTokens(user.userKey)
    assert.equal(storedToken.token_hash, sha256(token))
    assert.notEqual(storedToken.token_hash, token)
    assert.equal(storedToken.used_at, null)
  })

  test('e-mail inexistente ou conta não aprovada recebe o mesmo 202, sem e-mail', async () => {
    const pending = await createFixture({ profile: 'organizador', status: 'pending' })
    const rejected = await createFixture({ profile: 'fornecedor', status: 'rejected' })
    const blocked = await createFixture({ profile: 'fornecedor', status: 'blocked' })
    const missingEmail = `ninguem-${pending.userKey}@example.test`

    for (const address of [missingEmail, pending.email, rejected.email, blocked.email]) {
      const [status, response] = await RequestGenerator.POST_auth_esqueci_senha({ email: address })
      assert.equal(status, 202)
      assert.equal(response, null)
    }

    for (const address of [missingEmail, pending.email, rejected.email, blocked.email]) {
      assert.equal(await Mailpit.countEmailsAfterWaiting(address, 500), 0)
    }
  })

  test('novo pedido logo depois do anterior não envia outro e-mail', async () => {
    const user = await createFixture({ profile: 'fornecedor', status: 'approved' })

    await RequestGenerator.POST_auth_esqueci_senha({ email: user.email })
    await Mailpit.waitForEmailTo(user.email)
    const [status] = await RequestGenerator.POST_auth_esqueci_senha({ email: user.email })

    assert.equal(status, 202)
    assert.equal(await Mailpit.countEmailsAfterWaiting(user.email), 1)
    assert.equal((await DbUtils.getPasswordResetTokens(user.userKey)).length, 1)
  })

  test('e-mail faltando ou campo extra responde 400', async () => {
    for (const payload of [{}, { email: '' }, { email: 'a@b.com', extra: true }]) {
      const [status, response] = await RequestGenerator.POST_auth_esqueci_senha(payload)
      assert.equal(status, 400)
      assert.equal(response.code, 'APP000001')
    }
  })
})

describe('POST /auth/redefinir-senha', () => {
  test('o link do e-mail troca a senha: a nova entra, a antiga não, e o link não vale de novo', async () => {
    const user = await createFixture({ profile: 'organizador', status: 'approved' })
    await RequestGenerator.POST_auth_esqueci_senha({ email: user.email })
    const token = Mailpit.extractResetToken(await Mailpit.waitForEmailTo(user.email))

    const [status, response] = await RequestGenerator.POST_auth_redefinir_senha({ token, password: NEW_PASSWORD })

    assert.equal(status, 204)
    assert.equal(response, null)

    const [newLoginStatus] = await RequestGenerator.POST_auth_login({ email: user.email, password: NEW_PASSWORD })
    const [oldLoginStatus] = await RequestGenerator.POST_auth_login({ email: user.email, password: PASSWORD })
    assert.equal(newLoginStatus, 200)
    assert.equal(oldLoginStatus, 401)

    const [reuseStatus, reuseResponse] = await RequestGenerator.POST_auth_redefinir_senha({ token, password: 'outraSenha789' })
    assert.equal(reuseStatus, 400)
    assert.equal(reuseResponse.code, 'EVP000012')

    const storedUser = await DbUtils.getUserFixture(user.userKey)
    assert.ok(storedUser.password_changed_at)
  })

  test('usar um link invalida os outros links ainda abertos da mesma conta', async () => {
    const user = await createFixture({ profile: 'fornecedor', status: 'approved' })
    const firstToken = await DbUtils.createPasswordResetToken(user.userKey)
    const secondToken = await DbUtils.createPasswordResetToken(user.userKey)

    const [firstStatus] = await RequestGenerator.POST_auth_redefinir_senha({ token: secondToken, password: NEW_PASSWORD })
    const [secondStatus, response] = await RequestGenerator.POST_auth_redefinir_senha({ token: firstToken, password: NEW_PASSWORD })

    assert.equal(firstStatus, 204)
    assert.equal(secondStatus, 400)
    assert.equal(response.code, 'EVP000012')

    const tokens = await DbUtils.getPasswordResetTokens(user.userKey)
    assert.ok(tokens.every((storedToken) => storedToken.used_at !== null))
  })

  test('trocar a senha encerra o login aberto antes da troca', async () => {
    const user = await createFixture({ profile: 'organizador', status: 'approved' })
    const [, oldLogin] = await RequestGenerator.POST_auth_login({ email: user.email, password: PASSWORD })
    // o JWT marca a emissão em segundos
    await sleep(1_100)

    const token = await DbUtils.createPasswordResetToken(user.userKey)
    await RequestGenerator.POST_auth_redefinir_senha({ token, password: NEW_PASSWORD })

    const [oldSessionStatus, oldSessionResponse] = await RequestGenerator.GET_me({ Authorization: `Bearer ${oldLogin.token}` })
    assert.equal(oldSessionStatus, 401)
    assert.equal(oldSessionResponse.code, 'APP000401')

    const [, newLogin] = await RequestGenerator.POST_auth_login({ email: user.email, password: NEW_PASSWORD })
    const [newSessionStatus] = await RequestGenerator.GET_me({ Authorization: `Bearer ${newLogin.token}` })
    assert.equal(newSessionStatus, 200)
  })

  test('link vencido ou inexistente responde 400 e não troca a senha', async () => {
    const user = await createFixture({ profile: 'organizador', status: 'approved' })
    const expiredToken = await DbUtils.createPasswordResetToken(user.userKey, { expiresInSeconds: -1 })
    const unknownToken = 'x'.repeat(43)

    for (const token of [expiredToken, unknownToken]) {
      const [status, response] = await RequestGenerator.POST_auth_redefinir_senha({ token, password: NEW_PASSWORD })
      assert.equal(status, 400)
      assert.equal(response.code, 'EVP000012')
    }

    const [loginStatus] = await RequestGenerator.POST_auth_login({ email: user.email, password: PASSWORD })
    assert.equal(loginStatus, 200)
  })

  test('conta bloqueada depois do pedido não consegue usar o link', async () => {
    const user = await createFixture({ profile: 'fornecedor', status: 'approved' })
    const token = await DbUtils.createPasswordResetToken(user.userKey)
    await DbUtils.setUserStatus(user.userKey, 'blocked')

    const [status, response] = await RequestGenerator.POST_auth_redefinir_senha({ token, password: NEW_PASSWORD })

    assert.equal(status, 400)
    assert.equal(response.code, 'EVP000012')
  })

  test('senha fora do tamanho ou token faltando responde 400', async () => {
    const payloads = [
      { token: 'x'.repeat(43), password: 'curta' },
      { token: 'x'.repeat(43), password: 'a'.repeat(73) },
      { password: NEW_PASSWORD },
    ]

    for (const payload of payloads) {
      const [status, response] = await RequestGenerator.POST_auth_redefinir_senha(payload)
      assert.equal(status, 400)
      assert.equal(response.code, 'APP000001')
    }
  })
})
