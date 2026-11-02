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

// guarda a chave para apagar o usuário no fim do teste
async function register(payload) {
  const [status, response] = await RequestGenerator.POST_auth_cadastro(payload)
  if (status === 201) {
    fixtureUserKeys.push(response.user_key)
  }
  return [status, response]
}

describe('POST /auth/cadastro', () => {
  test('cadastra organizador pendente sem header Authorization e sem expor dados sensíveis', async () => {
    const payload = PayloadGenerator.createOrganizerRegistrationPayload({ email: '  RF01-Maiusculo@Example.TEST ' })

    const [status, response] = await register(payload)

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
    const [firstStatus] = await register(firstPayload)
    assert.equal(firstStatus, 201)

    const repeatedPayload = PayloadGenerator.createOrganizerRegistrationPayload({ email: firstPayload.email.toUpperCase() })
    const [status, response] = await register(repeatedPayload)

    assert.equal(status, 409)
    assert.equal(response.code, 'EVP000005')
  })

  test('CNPJ já cadastrado responde 409', async () => {
    const firstPayload = PayloadGenerator.createOrganizerRegistrationPayload()
    const [firstStatus] = await register(firstPayload)
    assert.equal(firstStatus, 201)

    const repeatedPayload = PayloadGenerator.createOrganizerRegistrationPayload({ cnpj: firstPayload.cnpj.replace(/\D/g, '') })
    const [status, response] = await register(repeatedPayload)

    assert.equal(status, 409)
    assert.equal(response.code, 'EVP000006')
  })

  test('CNPJ inválido responde 400', async () => {
    const payload = PayloadGenerator.createOrganizerRegistrationPayload({ cnpj: '11.222.333/0001-82' })

    const [status, response] = await register(payload)

    assert.equal(status, 400)
    assert.equal(response.code, 'EVP000007')
  })

  test('campo obrigatório faltando responde 400', async () => {
    const payload = PayloadGenerator.createOrganizerRegistrationPayload()
    delete payload.password

    const [status, response] = await register(payload)

    assert.equal(status, 400)
    assert.equal(response.code, 'APP000001')
  })

  test('campo extra responde 400', async () => {
    const payload = PayloadGenerator.createOrganizerRegistrationPayload({ status: 'approved' })

    const [status, response] = await register(payload)

    assert.equal(status, 400)
    assert.equal(response.code, 'APP000001')
  })

  test('aceita telefone fixo com 10 dígitos e recusa telefone sem 10 ou 11 dígitos', async () => {
    const [landlineStatus, landlineResponse] = await register(
      PayloadGenerator.createOrganizerRegistrationPayload({ phone: '(11) 3333-4444' }),
    )
    assert.equal(landlineStatus, 201)
    assert.equal((await DbUtils.getOrganizerByUserKey(landlineResponse.user_key)).phone, '1133334444')

    for (const phone of ['1199999', '119999988887']) {
      const [status] = await register(PayloadGenerator.createOrganizerRegistrationPayload({ phone }))
      assert.equal(status, 400)
    }
  })

  test('cadastros simultâneos com o mesmo e-mail aceitam só um', async () => {
    const email = PayloadGenerator.createOrganizerRegistrationPayload().email
    const payloads = Array.from({ length: 5 }, () => PayloadGenerator.createOrganizerRegistrationPayload({ email }))

    const results = await Promise.all(payloads.map((payload) => register(payload)))

    const statuses = results.map(([status]) => status).sort()
    assert.deepEqual(statuses, [201, 409, 409, 409, 409])
    assert.ok(results.filter(([status]) => status === 409).every(([, response]) => response.code === 'EVP000005'))
  })

  test('cadastros simultâneos com o mesmo CNPJ aceitam só um', async () => {
    const cnpj = PayloadGenerator.createOrganizerRegistrationPayload().cnpj
    const payloads = Array.from({ length: 5 }, () => PayloadGenerator.createOrganizerRegistrationPayload({ cnpj }))

    const results = await Promise.all(payloads.map((payload) => register(payload)))

    const statuses = results.map(([status]) => status).sort()
    assert.deepEqual(statuses, [201, 409, 409, 409, 409])
    assert.ok(results.filter(([status]) => status === 409).every(([, response]) => response.code === 'EVP000006'))
  })
})

describe('Autocadastro até a aprovação (ponta a ponta)', () => {
  test('organizador cadastrado pela API pode ser aprovado pelo admin', async () => {
    const [registrationStatus, registration] = await register(PayloadGenerator.createOrganizerRegistrationPayload())
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

describe('POST /auth/cadastro (fornecedor)', () => {
  test('cadastra fornecedor pendente com as categorias de atuação, sem header Authorization', async () => {
    const payload = PayloadGenerator.createSupplierRegistrationPayload({ categories: ['Bebidas', 'Alimentação'] })

    const [status, response] = await register(payload)

    assert.equal(status, 201)
    assert.deepEqual(Object.keys(response).sort(), ['profile', 'status', 'user_key'])
    assert.equal(response.profile, 'fornecedor')
    assert.equal(response.status, 'pending')

    const storedUser = await DbUtils.getUserFixture(response.user_key)
    assert.equal(storedUser.profile, 'fornecedor')
    assert.equal(storedUser.status, 'pending')

    const storedSupplier = await DbUtils.getSupplierByUserKey(response.user_key)
    assert.deepEqual(storedSupplier, {
      cnpj: payload.cnpj.replace(/\D/g, ''),
      phone: '11999998888',
      categories: ['Alimentação', 'Bebidas'],
    })
    assert.equal(await DbUtils.getOrganizerByUserKey(response.user_key), null)
  })

  test('fornecedor sem categorias de atuação responde 400', async () => {
    const payload = PayloadGenerator.createSupplierRegistrationPayload()
    delete payload.categories

    const [status, response] = await register(payload)

    assert.equal(status, 400)
    assert.equal(response.code, 'APP000001')
  })

  test('fornecedor com lista de categorias vazia responde 400', async () => {
    const payload = PayloadGenerator.createSupplierRegistrationPayload({ categories: [] })

    const [status, response] = await register(payload)

    assert.equal(status, 400)
    assert.equal(response.code, 'APP000001')
  })

  test('organizador com categorias de atuação responde 400', async () => {
    const payload = PayloadGenerator.createOrganizerRegistrationPayload({ categories: ['Estrutura'] })

    const [status, response] = await register(payload)

    assert.equal(status, 400)
    assert.equal(response.code, 'APP000001')
  })

  test('categoria fora da lista responde 400', async () => {
    const payload = PayloadGenerator.createSupplierRegistrationPayload({ categories: ['Estrutura', 'Som e luz'] })

    const [status, response] = await register(payload)

    assert.equal(status, 400)
    assert.equal(response.code, 'APP000001')
  })

  test('CNPJ já usado por um organizador barra o fornecedor com 409', async () => {
    const organizerPayload = PayloadGenerator.createOrganizerRegistrationPayload()
    const [organizerStatus] = await register(organizerPayload)
    assert.equal(organizerStatus, 201)

    const [status, response] = await register(PayloadGenerator.createSupplierRegistrationPayload({ cnpj: organizerPayload.cnpj }))

    assert.equal(status, 409)
    assert.equal(response.code, 'EVP000006')
  })

  test('CNPJ já usado por um fornecedor barra o organizador com 409', async () => {
    const supplierPayload = PayloadGenerator.createSupplierRegistrationPayload()
    const [supplierStatus] = await register(supplierPayload)
    assert.equal(supplierStatus, 201)

    const [status, response] = await register(
      PayloadGenerator.createOrganizerRegistrationPayload({ cnpj: supplierPayload.cnpj.replace(/\D/g, '') }),
    )

    assert.equal(status, 409)
    assert.equal(response.code, 'EVP000006')
  })

  test('CNPJ repetido entre dois fornecedores responde 409', async () => {
    const firstPayload = PayloadGenerator.createSupplierRegistrationPayload()
    const [firstStatus] = await register(firstPayload)
    assert.equal(firstStatus, 201)

    const [status, response] = await register(PayloadGenerator.createSupplierRegistrationPayload({ cnpj: firstPayload.cnpj }))

    assert.equal(status, 409)
    assert.equal(response.code, 'EVP000006')
  })

  test('e-mail já cadastrado (mesmo de outro perfil) responde 409', async () => {
    const organizerPayload = PayloadGenerator.createOrganizerRegistrationPayload()
    const [organizerStatus] = await register(organizerPayload)
    assert.equal(organizerStatus, 201)

    const [status, response] = await register(PayloadGenerator.createSupplierRegistrationPayload({ email: organizerPayload.email }))

    assert.equal(status, 409)
    assert.equal(response.code, 'EVP000005')
  })
})

describe('Autocadastro de fornecedor até o login (ponta a ponta)', () => {
  test('admin vê as categorias, aprova o fornecedor, e o fornecedor faz login', async () => {
    const payload = PayloadGenerator.createSupplierRegistrationPayload({ categories: ['Segurança'] })
    const [registrationStatus, registration] = await register(payload)
    assert.equal(registrationStatus, 201)

    const [pendingStatus, pending] = await RequestGenerator.POST_auth_login({ email: payload.email, password: payload.password })
    assert.equal(pendingStatus, 403)
    assert.equal(pending.code, 'EVP000009')

    const admin = await ObjectGenerator.createUserFixture({ profile: 'admin', status: 'approved' })
    fixtureUserKeys.push(admin.userKey)
    const adminHeaders = TokenGenerator.authorizationHeader('admin', { userKey: admin.userKey })

    let item
    for (let page = 0; item === undefined; page++) {
      const [listStatus, list] = await RequestGenerator.GET_admin_users({ status: 'pending', limit: 100, page }, adminHeaders)
      assert.equal(listStatus, 200)
      item = list.data.find((user) => user.user_key === registration.user_key)
      if (list.is_last_page) break
    }
    assert.ok(item, 'fornecedor aparece na lista de pendentes')
    assert.equal(item.profile, 'fornecedor')
    assert.deepEqual(item.categories, ['Segurança'])
    assert.equal(item.cnpj, payload.cnpj.replace(/\D/g, ''))

    const [approveStatus] = await RequestGenerator.PUT_admin_user_status(registration.user_key, { status: 'approved' }, adminHeaders)
    assert.equal(approveStatus, 202)

    const [loginStatus, login] = await RequestGenerator.POST_auth_login({ email: payload.email, password: payload.password })
    assert.equal(loginStatus, 200)
    assert.deepEqual(login.user, { user_key: registration.user_key, name: 'RF02 Fornecedor Teste', profile: 'fornecedor' })
  })
})
