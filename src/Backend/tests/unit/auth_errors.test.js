// Testes unitários dos erros de domínio do autocadastro.

import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { CnpjAlreadyRegistered, EmailAlreadyRegistered, errorVerification, InvalidCnpj } from '../../src/errors/index.js'

describe('Auth domain errors', () => {
  test('EmailAlreadyRegistered representa e-mail repetido com HTTP 409', () => {
    const error = new EmailAlreadyRegistered()

    assert.equal(error.httpStatus, 409)
    assert.equal(error.code, 'EVP000005')
    assert.equal(error.translation, 'Já existe um cadastro com este e-mail.')
  })

  test('CnpjAlreadyRegistered representa CNPJ repetido com HTTP 409', () => {
    const error = new CnpjAlreadyRegistered()

    assert.equal(error.httpStatus, 409)
    assert.equal(error.code, 'EVP000006')
    assert.equal(error.translation, 'Já existe um cadastro com este CNPJ.')
  })

  test('InvalidCnpj representa CNPJ inválido com HTTP 400', () => {
    const error = new InvalidCnpj()

    assert.equal(error.httpStatus, 400)
    assert.equal(error.code, 'EVP000007')
    assert.equal(error.translation, 'Informe um CNPJ válido.')
  })

  test('os códigos de todos os erros da API continuam únicos', () => {
    assert.doesNotThrow(() => errorVerification())
  })
})
