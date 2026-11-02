import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { errorVerification, NotFoundUser, UserStatusConflict } from '../../src/errors/index.js'

describe('User domain errors', () => {
  test('NotFoundUser representa uma conta inexistente com HTTP 404', () => {
    const error = new NotFoundUser('target-user-key')

    assert.equal(error.httpStatus, 404)
    assert.equal(error.code, 'EVP000003')
    assert.match(error.description, /target-user-key/)
  })

  test('UserStatusConflict representa um estado incompatível com HTTP 409', () => {
    const error = new UserStatusConflict('approved', 'rejected')

    assert.equal(error.httpStatus, 409)
    assert.equal(error.code, 'EVP000004')
    assert.match(error.description, /approved/)
    assert.match(error.description, /rejected/)
  })

  test('os códigos de todos os erros da API continuam únicos', () => {
    assert.doesNotThrow(() => errorVerification())
  })
})
