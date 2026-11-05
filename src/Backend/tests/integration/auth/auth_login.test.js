import assert from 'node:assert/strict'
import { afterEach, before, describe, test } from 'node:test'

import jwt from 'jsonwebtoken'

import { SecurityTools } from '../../../src/utils/security_tools.js'
import { DbUtils } from '../../utils/db_utils.js'
import { LOCAL_JWT_SECRET } from '../../utils/local_secrets.js'
import { ObjectGenerator } from '../../utils/object_generator.js'
import { RequestGenerator } from '../../utils/request_generator.js'
import { ClientRequisition } from '../../utils/requisition.js'
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

describe('POST /auth/login', () => {
  test('usuário aprovado recebe token válido com o perfil certo, sem dados sensíveis', async () => {
    for (const profile of ['organizador', 'fornecedor', 'admin']) {
      const user = await createFixture({ profile, status: 'approved' })

      const [status, response] = await RequestGenerator.POST_auth_login({ email: user.email, password: PASSWORD })

      assert.equal(status, 200)
      assert.deepEqual(Object.keys(response).sort(), ['token', 'user'])
      assert.deepEqual(response.user, { user_key: user.userKey, name: 'RF03 Test User', profile })

      const tokenContent = jwt.verify(response.token, LOCAL_JWT_SECRET)
      assert.equal(tokenContent.user_key, user.userKey)
      assert.equal(tokenContent.profile, profile)
    }
  })

  test('token do login abre as rotas do perfil (admin lista os cadastros)', async () => {
    const admin = await createFixture({ profile: 'admin', status: 'approved' })
    const [, login] = await RequestGenerator.POST_auth_login({ email: admin.email, password: PASSWORD })

    const [status] = await RequestGenerator.GET_admin_users({ limit: 1 }, { Authorization: `Bearer ${login.token}` })

    assert.equal(status, 200)
  })

  test('e-mail com maiúsculas e espaços encontra o cadastro', async () => {
    const user = await createFixture({ profile: 'organizador', status: 'approved' })

    const [status] = await RequestGenerator.POST_auth_login({ email: `  ${user.email.toUpperCase()} `, password: PASSWORD })

    assert.equal(status, 200)
  })

  test('senha errada e e-mail inexistente recebem o mesmo 401', async () => {
    const user = await createFixture({ profile: 'organizador', status: 'approved' })

    const [wrongPasswordStatus, wrongPassword] = await RequestGenerator.POST_auth_login({ email: user.email, password: 'senhaErrada123' })
    // e-mail novo a cada execução: senha errada conta no limite por e-mail, que dura entre execuções
    const [unknownEmailStatus, unknownEmail] = await RequestGenerator.POST_auth_login({
      email: `ninguem-${user.userKey}@example.test`,
      password: PASSWORD,
    })

    assert.equal(wrongPasswordStatus, 401)
    assert.equal(wrongPassword.code, 'EVP000008')
    assert.equal(wrongPassword.translation, 'E-mail ou senha incorretos.')
    assert.equal(unknownEmailStatus, 401)
    assert.deepEqual(unknownEmail, wrongPassword)
  })

  test('cadastro pendente recebe 403 de análise', async () => {
    const user = await createFixture({ profile: 'organizador', status: 'pending' })

    const [status, response] = await RequestGenerator.POST_auth_login({ email: user.email, password: PASSWORD })

    assert.equal(status, 403)
    assert.equal(response.code, 'EVP000009')
    assert.equal(response.translation, 'Seu cadastro ainda está em análise.')
  })

  test('cadastro rejeitado recebe 403 de não aprovado', async () => {
    const user = await createFixture({ profile: 'fornecedor', status: 'rejected' })

    const [status, response] = await RequestGenerator.POST_auth_login({ email: user.email, password: PASSWORD })

    assert.equal(status, 403)
    assert.equal(response.code, 'EVP000010')
    assert.equal(response.translation, 'Seu cadastro não foi aprovado.')
  })

  test('cadastro rejeitado recebe o resumo com o motivo informado pelo admin', async () => {
    const admin = await createFixture({ profile: 'admin', status: 'approved' })
    const supplier = await createFixture({ profile: 'fornecedor', status: 'pending' })
    const adminHeaders = TokenGenerator.authorizationHeader('admin', { userKey: admin.userKey })
    const [decisionStatus] = await RequestGenerator.PUT_admin_user_status(
      supplier.userKey,
      { status: 'rejected', reason: 'CNPJ com pendência na Receita.' },
      adminHeaders,
    )
    assert.equal(decisionStatus, 202)

    const [status, response] = await RequestGenerator.POST_auth_login({ email: supplier.email, password: PASSWORD })

    assert.equal(status, 403)
    assert.equal(response.code, 'EVP000010')
    assert.equal(response.details.profile, 'fornecedor')
    assert.equal(response.details.reason, 'CNPJ com pendência na Receita.')
    assert.deepEqual(response.details.categories, ['Estrutura', 'Segurança'])
    assert.match(response.details.cnpj, /^\d{14}$/)
    assert.ok(response.details.submitted_at)
    assert.ok(response.details.decided_at)
  })

  test('conta bloqueada recebe 403 de acesso bloqueado', async () => {
    const user = await createFixture({ profile: 'organizador', status: 'blocked' })

    const [status, response] = await RequestGenerator.POST_auth_login({ email: user.email, password: PASSWORD })

    assert.equal(status, 403)
    assert.equal(response.code, 'EVP000011')
    assert.equal(response.translation, 'Seu acesso foi bloqueado. Fale com o administrador da plataforma.')
  })

  test('conta bloqueada pelo admin recebe o motivo do bloqueio junto com o 403', async () => {
    const admin = await createFixture({ profile: 'admin', status: 'approved' })
    const user = await createFixture({ profile: 'fornecedor', status: 'approved' })
    const adminHeaders = TokenGenerator.authorizationHeader('admin', { userKey: admin.userKey })
    const [blockStatus] = await RequestGenerator.PUT_admin_user_status(
      user.userKey,
      { status: 'blocked', reason: 'Dados de contato falsos.' },
      adminHeaders,
    )
    assert.equal(blockStatus, 202)

    const [status, response] = await RequestGenerator.POST_auth_login({ email: user.email, password: PASSWORD })

    assert.equal(status, 403)
    assert.equal(response.code, 'EVP000011')
    assert.equal(response.details.profile, 'fornecedor')
    assert.equal(response.details.reason, 'Dados de contato falsos.')
    assert.ok(response.details.decided_at)
  })

  test('cadastro pendente com senha errada recebe 401, sem revelar o status', async () => {
    const user = await createFixture({ profile: 'organizador', status: 'pending' })

    const [status, response] = await RequestGenerator.POST_auth_login({ email: user.email, password: 'senhaErrada123' })

    assert.equal(status, 401)
    assert.equal(response.code, 'EVP000008')
  })

  test('campo faltando ou extra responde 400', async () => {
    const [missingStatus, missing] = await RequestGenerator.POST_auth_login({ email: 'alguem@example.test' })
    const [extraStatus, extra] = await RequestGenerator.POST_auth_login({
      email: 'alguem@example.test',
      password: PASSWORD,
      profile: 'admin',
    })

    assert.equal(missingStatus, 400)
    assert.equal(missing.code, 'APP000001')
    assert.equal(extraStatus, 400)
    assert.equal(extra.code, 'APP000001')
  })
})

describe('POST /auth/login (limite de tentativas)', () => {
  const MAX_FAILED_LOGINS = Number(process.env.RATE_LIMIT_MAX_FAILED_LOGINS_PER_EMAIL ?? 10)

  async function failLogins(email, times) {
    for (let attempt = 0; attempt < times; attempt++) {
      const [status] = await RequestGenerator.POST_auth_login({ email, password: 'senhaErrada123' })
      assert.equal(status, 401)
    }
  }

  test('senha errada demais no mesmo e-mail e IP responde 429, até com a senha certa; outro e-mail segue normal', async () => {
    const user = await createFixture({ profile: 'organizador', status: 'approved' })
    const otherUser = await createFixture({ profile: 'organizador', status: 'approved' })
    await failLogins(user.email, MAX_FAILED_LOGINS)

    const blocked = await ClientRequisition.send('POST', '/event_planning/auth/login', {
      payload: { email: user.email.toUpperCase(), password: PASSWORD },
    })
    const [otherStatus] = await RequestGenerator.POST_auth_login({ email: otherUser.email, password: PASSWORD })

    assert.equal(blocked.responseStatus, 429)
    assert.equal(blocked.responseJson.code, 'EVP000049')
    assert.match(blocked.responseJson.translation, /Aguarde \d+ minutos? e tente de novo/)
    assert.ok(Number(blocked.response.headers.get('retry-after')) > 0)
    assert.equal(otherStatus, 200)
  })

  test('login certo zera a contagem de senhas erradas', async () => {
    const user = await createFixture({ profile: 'fornecedor', status: 'approved' })

    await failLogins(user.email, MAX_FAILED_LOGINS - 1)
    const [firstStatus] = await RequestGenerator.POST_auth_login({ email: user.email, password: PASSWORD })
    await failLogins(user.email, MAX_FAILED_LOGINS - 1)
    const [secondStatus] = await RequestGenerator.POST_auth_login({ email: user.email, password: PASSWORD })

    assert.equal(firstStatus, 200)
    assert.equal(secondStatus, 200)
  })
})
