import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { afterEach, before, describe, test } from 'node:test'

import { SecurityTools } from '../../../src/utils/security_tools.js'
import { DbUtils } from '../../utils/db_utils.js'
import { Mailpit } from '../../utils/mailpit.js'
import { ObjectGenerator } from '../../utils/object_generator.js'
import { RequestGenerator } from '../../utils/request_generator.js'
import { TokenGenerator } from '../../utils/token_generator.js'

const PASSWORD = 'senhaForte123'
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

    const email = await Mailpit.waitForEmailTo(target.email)
    assert.equal(email.subject, 'Seu cadastro no TrocaTicket foi aprovado')
    // o login do site fica na raiz: /login não existe e daria 404
    assert.match(email.text, /http:\/\/localhost:5173\/$/m)
    assert.doesNotMatch(email.text, /\/login/)
  })

  test('admin rejeita um fornecedor pendente e registra a decisão com o motivo', async () => {
    const admin = await createFixture({ profile: 'admin', status: 'approved' })
    const target = await createFixture({ profile: 'fornecedor', status: 'pending' })

    const [status, response] = await RequestGenerator.PUT_admin_user_status(
      target.userKey,
      { status: 'rejected', reason: '  Documentação fiscal incompleta.  ' },
      adminHeaders(admin),
    )

    assert.equal(status, 202)
    assert.equal(response.status, 'rejected')

    const storedUser = await DbUtils.getUserFixture(target.userKey)
    assert.equal(storedUser.status, 'rejected')
    assert.equal(storedUser.approved_at, null)

    const [decision] = await DbUtils.getUserStatusHistory(target.userKey)
    assert.equal(decision.old_status, 'pending')
    assert.equal(decision.new_status, 'rejected')
    assert.equal(decision.reason, 'Documentação fiscal incompleta.')
    assert.equal(decision.admin_user_key, admin.userKey)

    const email = await Mailpit.waitForEmailTo(target.email)
    assert.equal(email.subject, 'Seu cadastro no TrocaTicket não foi aprovado')
    assert.match(email.text, /Documentação fiscal incompleta\./)
  })

  test('rejeitar sem motivo ou com motivo acima de 500 caracteres responde 400 e não muda o status', async () => {
    const admin = await createFixture({ profile: 'admin', status: 'approved' })
    const target = await createFixture({ profile: 'fornecedor', status: 'pending' })
    const payloads = [{ status: 'rejected' }, { status: 'rejected', reason: '   ' }, { status: 'rejected', reason: 'a'.repeat(501) }]

    for (const payload of payloads) {
      const [status, response] = await RequestGenerator.PUT_admin_user_status(target.userKey, payload, adminHeaders(admin))
      assert.equal(status, 400)
      assert.equal(response.code, 'APP000001')
    }

    const storedUser = await DbUtils.getUserFixture(target.userKey)
    assert.equal(storedUser.status, 'pending')
    assert.deepEqual(await DbUtils.getUserStatusHistory(target.userKey), [])
    assert.equal(await Mailpit.countEmailsAfterWaiting(target.email, 500), 0)
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

  test('mudança de status fora do fluxo responde 409 e não muda nada', async () => {
    const admin = await createFixture({ profile: 'admin', status: 'approved' })
    const invalidChanges = [
      ['pending', { status: 'blocked', reason: 'Fora do fluxo.' }],
      ['approved', { status: 'approved' }],
      ['approved', { status: 'rejected', reason: 'Cadastro duplicado.' }],
      ['rejected', { status: 'approved' }],
      ['rejected', { status: 'blocked', reason: 'Fora do fluxo.' }],
      ['blocked', { status: 'rejected', reason: 'Fora do fluxo.' }],
    ]

    for (const [currentStatus, payload] of invalidChanges) {
      const target = await createFixture({ profile: 'organizador', status: currentStatus })

      const [status, response] = await RequestGenerator.PUT_admin_user_status(target.userKey, payload, adminHeaders(admin))

      assert.equal(status, 409, `${currentStatus} -> ${payload.status}`)
      assert.equal(response.code, 'EVP000004')
      assert.equal((await DbUtils.getUserFixture(target.userKey)).status, currentStatus)
    }
  })

  test('admin bloqueia um usuário aprovado com motivo: o login passa a ser barrado e ele recebe o e-mail', async () => {
    const admin = await createFixture({ profile: 'admin', status: 'approved' })
    const target = await createFixture({ profile: 'fornecedor', status: 'approved' })
    const approvedAt = (await DbUtils.getUserFixture(target.userKey)).approved_at

    const [status, response] = await RequestGenerator.PUT_admin_user_status(
      target.userKey,
      { status: 'blocked', reason: 'Propostas falsas.' },
      adminHeaders(admin),
    )

    assert.equal(status, 202)
    assert.equal(response.status, 'blocked')

    const storedUser = await DbUtils.getUserFixture(target.userKey)
    assert.equal(storedUser.status, 'blocked')
    assert.deepEqual(storedUser.approved_at, approvedAt)

    const [decision] = await DbUtils.getUserStatusHistory(target.userKey)
    assert.equal(decision.old_status, 'approved')
    assert.equal(decision.new_status, 'blocked')
    assert.equal(decision.reason, 'Propostas falsas.')

    const [loginStatus, loginResponse] = await RequestGenerator.POST_auth_login({ email: target.email, password: PASSWORD })
    assert.equal(loginStatus, 403)
    assert.equal(loginResponse.code, 'EVP000011')

    const email = await Mailpit.waitForEmailTo(target.email)
    assert.equal(email.subject, 'Seu acesso ao TrocaTicket foi bloqueado')
    assert.match(email.text, /Propostas falsas\./)
  })

  test('bloquear sem motivo responde 400', async () => {
    const admin = await createFixture({ profile: 'admin', status: 'approved' })
    const target = await createFixture({ profile: 'organizador', status: 'approved' })

    const [status, response] = await RequestGenerator.PUT_admin_user_status(target.userKey, { status: 'blocked' }, adminHeaders(admin))

    assert.equal(status, 400)
    assert.equal(response.code, 'APP000001')
    assert.equal((await DbUtils.getUserFixture(target.userKey)).status, 'approved')
  })

  test('admin reativa um usuário bloqueado, que volta a entrar e recebe o e-mail', async () => {
    const admin = await createFixture({ profile: 'admin', status: 'approved' })
    const target = await createFixture({ profile: 'organizador', status: 'approved' })
    const approvedAt = (await DbUtils.getUserFixture(target.userKey)).approved_at
    await RequestGenerator.PUT_admin_user_status(target.userKey, { status: 'blocked', reason: 'Investigação.' }, adminHeaders(admin))
    await Mailpit.waitForEmailTo(target.email)

    const [status, response] = await RequestGenerator.PUT_admin_user_status(target.userKey, { status: 'approved' }, adminHeaders(admin))

    assert.equal(status, 202)
    assert.equal(response.status, 'approved')
    assert.deepEqual((await DbUtils.getUserFixture(target.userKey)).approved_at, approvedAt)

    const history = await DbUtils.getUserStatusHistory(target.userKey)
    assert.deepEqual(
      history.map((decision) => [decision.old_status, decision.new_status]),
      [
        ['approved', 'blocked'],
        ['blocked', 'approved'],
      ],
    )

    const [loginStatus] = await RequestGenerator.POST_auth_login({ email: target.email, password: PASSWORD })
    assert.equal(loginStatus, 200)

    const latestEmail = await Mailpit.waitForEmailTo(target.email, { expectedCount: 2 })
    assert.equal(latestEmail.subject, 'Seu acesso ao TrocaTicket foi reativado')
  })

  test('o histórico registra o admin que decidiu, mesmo com vários admins', async () => {
    const firstAdmin = await createFixture({ profile: 'admin', status: 'approved' })
    const secondAdmin = await createFixture({ profile: 'admin', status: 'approved' })
    const target = await createFixture({ profile: 'organizador', status: 'pending' })

    await RequestGenerator.PUT_admin_user_status(target.userKey, { status: 'approved' }, adminHeaders(secondAdmin))
    await RequestGenerator.PUT_admin_user_status(target.userKey, { status: 'blocked', reason: 'Denúncia.' }, adminHeaders(firstAdmin))

    const history = await DbUtils.getUserStatusHistory(target.userKey)
    assert.deepEqual(
      history.map((decision) => decision.admin_user_key),
      [secondAdmin.userKey, firstAdmin.userKey],
    )
  })

  test('admin ainda pendente não consegue decidir', async () => {
    const pendingAdmin = await createFixture({ profile: 'admin', status: 'pending' })
    const target = await createFixture({ profile: 'organizador', status: 'pending' })

    const [status, response] = await RequestGenerator.PUT_admin_user_status(
      target.userKey,
      { status: 'approved' },
      adminHeaders(pendingAdmin),
    )

    assert.equal(status, 403)
    assert.equal(response.code, 'APP000403')
    assert.equal((await DbUtils.getUserFixture(target.userKey)).status, 'pending')
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

    const decisions = [{ status: 'approved' }, { status: 'rejected', reason: 'Dados divergentes.' }]
    const results = await Promise.all(
      decisions.map((decision) => RequestGenerator.PUT_admin_user_status(target.userKey, decision, headers)),
    )

    assert.deepEqual(results.map(([status]) => status).sort(), [202, 409])

    const acceptedDecision = decisions[results.findIndex(([status]) => status === 202)]
    const storedUser = await DbUtils.getUserFixture(target.userKey)
    const history = await DbUtils.getUserStatusHistory(target.userKey)
    assert.equal(storedUser.status, acceptedDecision.status)
    assert.equal(history.length, 1)
    assert.equal(history[0].new_status, acceptedDecision.status)
  })
})
