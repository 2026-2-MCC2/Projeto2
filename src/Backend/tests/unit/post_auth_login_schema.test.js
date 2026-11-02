// Testes unitários do contrato do body de login.

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, test } from 'node:test'

import Ajv from 'ajv'

const schemaPath = new URL('../../src/schemas/post_auth_login.json', import.meta.url)
const schema = JSON.parse(readFileSync(schemaPath, 'utf8'))
const validate = new Ajv().compile(schema)

describe('POST auth login schema', () => {
  test('aceita e-mail e senha', () => {
    assert.equal(validate({ email: 'maria@exemplo.com', password: 'senhaForte123' }), true)
  })

  test('recusa e-mail ou senha faltando', () => {
    assert.equal(validate({ email: 'maria@exemplo.com' }), false)
    assert.equal(validate({ password: 'senhaForte123' }), false)
    assert.equal(validate({}), false)
  })

  test('recusa campos vazios ou com tipo errado', () => {
    assert.equal(validate({ email: '', password: 'senhaForte123' }), false)
    assert.equal(validate({ email: 'maria@exemplo.com', password: '' }), false)
    assert.equal(validate({ email: 'maria@exemplo.com', password: 12345678 }), false)
  })

  test('recusa senha acima do limite do bcrypt', () => {
    assert.equal(validate({ email: 'maria@exemplo.com', password: 'a'.repeat(73) }), false)
  })

  test('recusa propriedade extra', () => {
    assert.equal(validate({ email: 'maria@exemplo.com', password: 'senhaForte123', profile: 'admin' }), false)
  })
})
