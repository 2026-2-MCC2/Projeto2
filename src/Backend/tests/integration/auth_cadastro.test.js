// Testes de integração do autocadastro de organizador (RF01).

import assert from 'node:assert/strict'
import { afterEach, describe, test } from 'node:test'

import { DbUtils } from '../utils/db_utils.js'
import { ObjectGenerator } from '../utils/object_generator.js'
import { PayloadGenerator } from '../utils/payload_generator.js'
import { RequestGenerator } from '../utils/request_generator.js'
import { TokenGenerator } from '../utils/token_generator.js'

const fixtureUserKeys = []

afterEach(async () => {
  await DbUtils.deleteUserFixtures(fixtureUserKeys.splice(0))
})

// cadastra pela API e guarda a chave para apagar o usuário no fim do teste
async function registerOrganizer(payload) {
  const [status, response] = await RequestGenerator.POST_auth_cadastro(payload)
  if (status === 201) {
    fixtureUserKeys.push(response.user_key)
  }
  return [status, response]
}

describe('POST /auth/cadastro', () => {
  test('cadastra organizador pendente sem header Authorization e sem expor dados sensíveis', async () => {
    const payload = PayloadGenerator.createOrganizerRegistrationPayload({ email: '  RF01-Maiusculo@Example.TEST ' })

    const [status, response] = await registerOrganizer(payload)

    assert.equal(status, 201)
    assert.deepEqual(Object.keys(response).sort(), ['profile', 'status', 'user_key'])
    assert.equal(response.profile, 'organizador')
    assert.equal(response.status, 'pending')

    const storedUser = await DbUtils.getUserFixture(response.user_key)
    assert.equal(storedUser.email, 'rf01-maiusculo@example.test')
    assert.equal(storedUser.profile, 'organizador')
    assert.equal(storedUser.status, 'pending')
    assert.equal(storedUser.approved_at, null)

    const storedOrganizer = await DbUtils.getOrganizerByUserKey(response.user_key)
    assert.equal(storedOrganizer.cnpj, payload.cnpj.replace(/\D/g, ''))
    assert.equal(storedOrganizer.phone, '11999998888')
  })

  test('e-mail já cadastrado responde 409', async () => {
    const firstPayload = PayloadGenerator.createOrganizerRegistrationPayload()
    const [firstStatus] = await registerOrganizer(firstPayload)
    assert.equal(firstStatus, 201)

    const repeatedPayload = PayloadGenerator.createOrganizerRegistrationPayload({ email: firstPayload.email.toUpperCase() })
    const [status, response] = await registerOrganizer(repeatedPayload)

    assert.equal(status, 409)
    assert.equal(response.code, 'EVP000005')
  })

  test('CNPJ já cadastrado responde 409', async () => {
    const firstPayload = PayloadGenerator.createOrganizerRegistrationPayload()
    const [firstStatus] = await registerOrganizer(firstPayload)
    assert.equal(firstStatus, 201)

    const repeatedPayload = PayloadGenerator.createOrganizerRegistrationPayload({ cnpj: firstPayload.cnpj.replace(/\D/g, '') })
    const [status, response] = await registerOrganizer(repeatedPayload)

    assert.equal(status, 409)
    assert.equal(response.code, 'EVP000006')
  })

  test('CNPJ inválido responde 400', async () => {
    const payload = PayloadGenerator.createOrganizerRegistrationPayload({ cnpj: '11.222.333/0001-82' })

    const [status, response] = await registerOrganizer(payload)

    assert.equal(status, 400)
    assert.equal(response.code, 'EVP000007')
  })

  test('campo obrigatório faltando responde 400', async () => {
    const payload = PayloadGenerator.createOrganizerRegistrationPayload()
    delete payload.password

    const [status, response] = await registerOrganizer(payload)

    assert.equal(status, 400)
    assert.equal(response.code, 'APP000001')
  })

  test('campo extra responde 400', async () => {
    const payload = PayloadGenerator.createOrganizerRegistrationPayload({ status: 'approved' })

    const [status, response] = await registerOrganizer(payload)

    assert.equal(status, 400)
    assert.equal(response.code, 'APP000001')
  })
})

describe('Autocadastro até a aprovação (ponta a ponta)', () => {
  test('organizador cadastrado pela API pode ser aprovado pelo admin', async () => {
    const [registrationStatus, registration] = await registerOrganizer(PayloadGenerator.createOrganizerRegistrationPayload())
    assert.equal(registrationStatus, 201)

    const admin = await ObjectGenerator.createUserFixture({ profile: 'admin', status: 'approved' })
    fixtureUserKeys.push(admin.userKey)
    const adminHeaders = TokenGenerator.authorizationHeader('admin', { userKey: admin.userKey })

    const [status, response] = await RequestGenerator.PUT_admin_user_status(registration.user_key, { status: 'approved' }, adminHeaders)

    assert.equal(status, 202)
    assert.equal(response.status, 'approved')

    const storedUser = await DbUtils.getUserFixture(registration.user_key)
    assert.equal(storedUser.status, 'approved')
    assert.ok(storedUser.approved_at)
  })
})
