// Testes unitários dos erros de domínio do autocadastro.

import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import {
  CnpjAlreadyRegistered,
  EmailAlreadyRegistered,
  errorVerification,
  InvalidCnpj,
  InvalidCredentials,
  RegistrationPending,
  RegistrationRejected,
} from '../../src/errors/index.js'

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

  test('InvalidCredentials é o 401 único do login', () => {
    const error = new InvalidCredentials()

    assert.equal(error.httpStatus, 401)
    assert.equal(error.code, 'EVP000008')
    assert.equal(error.translation, 'E-mail ou senha incorretos.')
  })

  test('RegistrationPending e RegistrationRejected barram o login com 403', () => {
    const pending = new RegistrationPending()
    const rejected = new RegistrationRejected()

    assert.equal(pending.httpStatus, 403)
    assert.equal(pending.code, 'EVP000009')
    assert.equal(pending.translation, 'Seu cadastro ainda está em análise.')
    assert.equal(rejected.httpStatus, 403)
    assert.equal(rejected.code, 'EVP000010')
    assert.equal(rejected.translation, 'Seu cadastro não foi aprovado.')
  })

  test('os códigos de todos os erros da API continuam únicos', () => {
    assert.doesNotThrow(() => errorVerification())
  })
})
