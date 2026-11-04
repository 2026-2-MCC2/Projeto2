import assert from 'node:assert/strict'
import { afterEach, before, describe, test } from 'node:test'
import { setTimeout as sleep } from 'node:timers/promises'

import { SecurityTools } from '../../src/utils/security_tools.js'
import { DbUtils } from '../utils/db_utils.js'
import { ObjectGenerator } from '../utils/object_generator.js'
import { RequestGenerator } from '../utils/request_generator.js'
import { TokenGenerator } from '../utils/token_generator.js'

const PASSWORD = 'senhaForte123'
const fixtureUserKeys = []
let passwordHash

before(async () => {
  passwordHash = await SecurityTools.hashPassword(PASSWORD)
})

afterEach(async () => DbUtils.deleteUserFixtures(fixtureUserKeys.splice(0)))

async function createLoggedUser(profile) {
  const user = await ObjectGenerator.createUserFixture({ profile, status: 'approved', passwordHash })
  fixtureUserKeys.push(user.userKey)
  return { ...user, headers: TokenGenerator.authorizationHeader(profile, { userKey: user.userKey }) }
}

describe('PATCH /me', () => {
  test('organizador altera nome, telefone, responsável, cidade e estado; e-mail e CNPJ continuam', async () => {
    const organizer = await createLoggedUser('organizador')
    const [, before] = await RequestGenerator.GET_me(organizer.headers)

    const [status, response] = await RequestGenerator.PATCH_me(
      { name: '  Aurora Eventos  ', phone: '(11) 3333-4444', responsible_name: 'Lia Souza', city: 'Campinas', state: 'sp' },
      organizer.headers,
    )

    assert.equal(status, 200)
    assert.equal(response.name, 'Aurora Eventos')
    assert.equal(response.phone, '1133334444')
    assert.equal(response.responsible_name, 'Lia Souza')
    assert.equal(response.city, 'Campinas')
    assert.equal(response.state, 'SP')
    assert.equal(response.email, before.email)
    assert.equal(response.cnpj, before.cnpj)
  })

  test('só os campos enviados mudam, e campo opcional em branco vira vazio', async () => {
    const supplier = await createLoggedUser('fornecedor')
    await RequestGenerator.PATCH_me({ responsible_name: 'Ana', city: 'Santos' }, supplier.headers)

    const [status, response] = await RequestGenerator.PATCH_me({ responsible_name: '   ', state: '' }, supplier.headers)

    assert.equal(status, 200)
    assert.equal(response.responsible_name, null)
    assert.equal(response.state, null)
    assert.equal(response.city, 'Santos')
  })

  test('admin altera só o nome', async () => {
    const admin = await createLoggedUser('admin')

    const [status, response] = await RequestGenerator.PATCH_me({ name: 'Admin Geral' }, admin.headers)

    assert.equal(status, 200)
    assert.equal(response.name, 'Admin Geral')
  })

  test('nome em branco, telefone curto, e-mail, CNPJ ou body vazio respondem 400', async () => {
    const organizer = await createLoggedUser('organizador')
    const invalidPayloads = [{ name: '   ' }, { email: 'outro@exemplo.com' }, { cnpj: '11222333000181' }, {}, { state: 'São Paulo' }]

    for (const payload of invalidPayloads) {
      const [status, response] = await RequestGenerator.PATCH_me(payload, organizer.headers)
      assert.equal(status, 400, JSON.stringify(payload))
      assert.equal(response.code, 'APP000001')
    }

    const [phoneStatus, phoneResponse] = await RequestGenerator.PATCH_me({ phone: '(11) 9999-99' }, organizer.headers)
    assert.equal(phoneStatus, 400)
    assert.equal(phoneResponse.code, 'APP000010')
  })

  test('sem token responde 401', async () => {
    const [status] = await RequestGenerator.PATCH_me({ name: 'Ninguém' })
    assert.equal(status, 401)
  })
})

describe('PUT /me/categorias', () => {
  test('fornecedor troca as categorias de atuação', async () => {
    const supplier = await createLoggedUser('fornecedor')

    const [status, response] = await RequestGenerator.PUT_me_categorias({ categories: ['Tecnologia', 'Bebidas'] }, supplier.headers)

    assert.equal(status, 200)
    assert.deepEqual(response.categories, ['Bebidas', 'Tecnologia'])
  })

  test('lista vazia, repetida ou com categoria inexistente responde 400', async () => {
    const supplier = await createLoggedUser('fornecedor')

    for (const categories of [[], ['Bebidas', 'Bebidas'], ['Marketing']]) {
      const [status, response] = await RequestGenerator.PUT_me_categorias({ categories }, supplier.headers)
      assert.equal(status, 400, JSON.stringify(categories))
      assert.equal(response.code, 'APP000001')
    }
  })

  test('organizador recebe 403', async () => {
    const organizer = await createLoggedUser('organizador')

    const [status, response] = await RequestGenerator.PUT_me_categorias({ categories: ['Bebidas'] }, organizer.headers)

    assert.equal(status, 403)
    assert.equal(response.code, 'APP000403')
  })
})

describe('PUT /me/senha', () => {
  test('com a senha atual certa troca a senha, devolve um token novo e encerra o login antigo', async () => {
    const organizer = await createLoggedUser('organizador')
    const [, oldLogin] = await RequestGenerator.POST_auth_login({ email: organizer.email, password: PASSWORD })
    const oldHeaders = { Authorization: `Bearer ${oldLogin.token}` }
    // o JWT marca a emissão em segundos
    await sleep(1_100)

    const [status, response] = await RequestGenerator.PUT_me_senha({ current_password: PASSWORD, new_password: 'novaSenha456' }, oldHeaders)

    assert.equal(status, 200)
    const [newSessionStatus] = await RequestGenerator.GET_me({ Authorization: `Bearer ${response.token}` })
    const [oldSessionStatus] = await RequestGenerator.GET_me(oldHeaders)
    assert.equal(newSessionStatus, 200)
    assert.equal(oldSessionStatus, 401)

    const [newPasswordLogin] = await RequestGenerator.POST_auth_login({ email: organizer.email, password: 'novaSenha456' })
    assert.equal(newPasswordLogin, 200)
  })

  test('senha atual errada responde 400 com EVP000037 e não troca nada', async () => {
    const supplier = await createLoggedUser('fornecedor')

    const [status, response] = await RequestGenerator.PUT_me_senha(
      { current_password: 'senhaErrada', new_password: 'novaSenha456' },
      supplier.headers,
    )

    assert.equal(status, 400)
    assert.equal(response.code, 'EVP000037')
    const [loginStatus] = await RequestGenerator.POST_auth_login({ email: supplier.email, password: PASSWORD })
    assert.equal(loginStatus, 200)
  })

  test('senha nova curta responde 400', async () => {
    const organizer = await createLoggedUser('organizador')

    const [status, response] = await RequestGenerator.PUT_me_senha({ current_password: PASSWORD, new_password: 'curta' }, organizer.headers)

    assert.equal(status, 400)
    assert.equal(response.code, 'APP000001')
  })
})
