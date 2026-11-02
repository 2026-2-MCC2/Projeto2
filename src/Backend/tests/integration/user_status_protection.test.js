// A API só deve aceitar tokens de usuários aprovados e com perfil correspondente ao banco.

import assert from 'node:assert/strict'
import { afterEach, describe, test } from 'node:test'

import { DbUtils } from '../utils/db_utils.js'
import { ObjectGenerator } from '../utils/object_generator.js'
import { ClientRequisition } from '../utils/requisition.js'
import { TokenGenerator } from '../utils/token_generator.js'

const fixtureKeys = []

afterEach(async () => DbUtils.deleteUserFixtures(fixtureKeys.splice(0)))

async function requestAs(user, tokenProfile = user.profile) {
  return ClientRequisition.send('GET', '/event_planning/sample_entities', {
    headers: TokenGenerator.authorizationHeader(tokenProfile, { userKey: user.userKey }),
  })
}

async function createUser(profile, status) {
  const user = await ObjectGenerator.createUserFixture({ profile, status })
  fixtureKeys.push(user.userKey)
  return user
}

describe('Status persistido do usuário', () => {
  test('bloqueia token de usuário pendente', async () => {
    const pending = await createUser('organizador', 'pending')
    const response = await requestAs(pending)

    assert.equal(response.responseStatus, 403)
    assert.equal(response.responseJson.code, 'APP000403')
  })

  test('bloqueia token de usuário rejeitado', async () => {
    const rejected = await createUser('fornecedor', 'rejected')
    const response = await requestAs(rejected)

    assert.equal(response.responseStatus, 403)
    assert.equal(response.responseJson.code, 'APP000403')
  })

  test('permite usuário aprovado cujo perfil coincide com o token', async () => {
    const approved = await createUser('organizador', 'approved')
    const response = await requestAs(approved)

    assert.equal(response.responseStatus, 200)
  })

  test('bloqueia token cujo perfil diverge do perfil persistido', async () => {
    const approved = await createUser('organizador', 'approved')
    const response = await requestAs(approved, 'fornecedor')

    assert.equal(response.responseStatus, 403)
    assert.equal(response.responseJson.code, 'APP000403')
  })
})
