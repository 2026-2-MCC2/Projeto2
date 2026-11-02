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

  test('aceita rejeição com motivo', () => {
    assert.equal(validate({ status: 'rejected', reason: 'Documentação incompleta.' }), true)
  })

  test('recusa rejeição sem motivo ou com motivo em branco', () => {
    assert.equal(validate({ status: 'rejected' }), false)
    assert.equal(validate({ status: 'rejected', reason: '   ' }), false)
  })

  test('recusa motivo com mais de 500 caracteres', () => {
    assert.equal(validate({ status: 'rejected', reason: 'a'.repeat(501) }), false)
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
    assert.equal(validate({ status: 'approved', comment: 'documentação incompleta' }), false)
  })
})
