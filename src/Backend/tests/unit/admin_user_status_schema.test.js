// Testes unitários do contrato do body de decisão administrativa de usuário.

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, test } from 'node:test'

import Ajv from 'ajv'

const schemaPath = new URL('../../src/schemas/put_admin_user_status.json', import.meta.url)
const schema = JSON.parse(readFileSync(schemaPath, 'utf8'))
const validate = new Ajv().compile(schema)

describe('PUT admin user status schema', () => {
  test('aceita aprovação', () => {
    assert.equal(validate({ status: 'approved' }), true)
  })

  test('aceita rejeição', () => {
    assert.equal(validate({ status: 'rejected' }), true)
  })

  test('recusa body vazio', () => {
    assert.equal(validate({}), false)
  })

  test('recusa status inválido', () => {
    assert.equal(validate({ status: 'pending' }), false)
  })

  test('recusa status com tipo errado', () => {
    assert.equal(validate({ status: 1 }), false)
  })

  test('recusa propriedade extra', () => {
    assert.equal(validate({ status: 'approved', reason: 'documentação incompleta' }), false)
  })
})
