import assert from 'node:assert/strict'
import { afterEach, describe, test } from 'node:test'

import { DbUtils } from '../utils/db_utils.js'
import { ObjectGenerator } from '../utils/object_generator.js'
import { RequestGenerator } from '../utils/request_generator.js'
import { TokenGenerator } from '../utils/token_generator.js'

const fixtureUserKeys = []

afterEach(async () => DbUtils.deleteUserFixtures(fixtureUserKeys.splice(0)))

describe('GET /me', () => {
  test('devolve os dados públicos de quem está logado', async () => {
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
    })
  })

  test('sem token responde 401', async () => {
    const [status, response] = await RequestGenerator.GET_me()

    assert.equal(status, 401)
    assert.equal(response.code, 'APP000401')
  })
})
