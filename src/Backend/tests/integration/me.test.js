import assert from 'node:assert/strict'
import { afterEach, describe, test } from 'node:test'

import { DbUtils } from '../utils/db_utils.js'
import { ObjectGenerator } from '../utils/object_generator.js'
import { RequestGenerator } from '../utils/request_generator.js'
import { TokenGenerator } from '../utils/token_generator.js'

const fixtureUserKeys = []

afterEach(async () => DbUtils.deleteUserFixtures(fixtureUserKeys.splice(0)))

describe('GET /me', () => {
  test('devolve os dados públicos de quem está logado (fornecedor com categorias)', async () => {
    const supplier = await ObjectGenerator.createUserFixture({ profile: 'fornecedor', status: 'approved' })
    fixtureUserKeys.push(supplier.userKey)
    const headers = TokenGenerator.authorizationHeader('fornecedor', { userKey: supplier.userKey })

    const [status, response] = await RequestGenerator.GET_me(headers)

    assert.equal(status, 200)
    assert.deepEqual(response, {
      user_key: supplier.userKey,
      name: 'RF03 Test User',
      email: supplier.email,
      profile: 'fornecedor',
      status: 'approved',
      cnpj: response.cnpj,
      phone: '11999999999',
      responsible_name: null,
      city: null,
      state: null,
      categories: ['Estrutura', 'Segurança'],
    })
  })

  test('devolve os dados cadastrais do organizador (cnpj, telefone e responsável)', async () => {
    const organizer = await ObjectGenerator.createUserFixture({ profile: 'organizador', status: 'approved' })
    fixtureUserKeys.push(organizer.userKey)
    const headers = TokenGenerator.authorizationHeader('organizador', { userKey: organizer.userKey })

    const [status, response] = await RequestGenerator.GET_me(headers)

    assert.equal(status, 200)
    assert.equal(response.user_key, organizer.userKey)
    assert.equal(response.profile, 'organizador')
    assert.equal(response.phone, '11999999999')
    assert.equal(typeof response.cnpj, 'string')
    assert.equal(response.categories, null)
  })

  test('sem token responde 401', async () => {
    const [status, response] = await RequestGenerator.GET_me()

    assert.equal(status, 401)
    assert.equal(response.code, 'APP000401')
  })
})
