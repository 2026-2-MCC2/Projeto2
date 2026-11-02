// Testes unitários do contrato do body de autocadastro.

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, test } from 'node:test'

import Ajv from 'ajv'

const schemaPath = new URL('../../src/schemas/post_auth_cadastro.json', import.meta.url)
const schema = JSON.parse(readFileSync(schemaPath, 'utf8'))
const validate = new Ajv().compile(schema)

function createPayload(overrides = {}) {
  return {
    profile: 'organizador',
    name: 'Maria Organizadora',
    email: 'maria@exemplo.com',
    password: 'senhaForte123',
    cnpj: '11.222.333/0001-81',
    phone: '(11) 99999-8888',
    ...overrides,
  }
}

describe('POST auth cadastro schema', () => {
  test('aceita cadastro de organizador completo', () => {
    assert.equal(validate(createPayload()), true)
  })

  test('aceita CNPJ só com dígitos', () => {
    assert.equal(validate(createPayload({ cnpj: '11222333000181' })), true)
  })

  test('recusa perfil admin (ninguém vira admin pelo autocadastro)', () => {
    assert.equal(validate(createPayload({ profile: 'admin' })), false)
  })

  test('aceita fornecedor com cada uma das áreas de atuação', () => {
    for (const area of ['Estrutura', 'Alimentação', 'Segurança', 'Outros']) {
      assert.equal(validate(createPayload({ profile: 'fornecedor', service_area: area })), true, area)
    }
  })

  test('recusa fornecedor sem área de atuação', () => {
    assert.equal(validate(createPayload({ profile: 'fornecedor' })), false)
    assert.equal(validate.errors[0].params.missingProperty, 'service_area')
  })

  test('recusa área de atuação fora das categorias', () => {
    assert.equal(validate(createPayload({ profile: 'fornecedor', service_area: 'Som' })), false)
    assert.equal(validate(createPayload({ profile: 'fornecedor', service_area: 'estrutura' })), false)
  })

  test('recusa organizador com área de atuação', () => {
    assert.equal(validate(createPayload({ service_area: 'Estrutura' })), false)
    assert.equal(validate.errors[0].instancePath, '/service_area')
  })

  test('recusa cada campo obrigatório faltando', () => {
    for (const field of ['profile', 'name', 'email', 'password', 'cnpj', 'phone']) {
      const payload = createPayload()
      delete payload[field]
      assert.equal(validate(payload), false, `campo ${field} é obrigatório`)
    }
  })

  test('recusa e-mail sem formato de e-mail', () => {
    assert.equal(validate(createPayload({ email: 'maria.exemplo.com' })), false)
    assert.equal(validate(createPayload({ email: 'maria@exemplo' })), false)
    assert.equal(validate(createPayload({ email: `${'a'.repeat(140)}@exemplo.com` })), false)
  })

  test('recusa senha menor que 8 ou maior que 72 caracteres', () => {
    assert.equal(validate(createPayload({ password: '1234567' })), false)
    assert.equal(validate(createPayload({ password: 'a'.repeat(73) })), false)
    assert.equal(validate(createPayload({ password: 'a'.repeat(72) })), true)
  })

  test('recusa nome vazio, CNPJ e telefone fora do tamanho', () => {
    assert.equal(validate(createPayload({ name: '' })), false)
    assert.equal(validate(createPayload({ cnpj: '1122233300018' })), false)
    assert.equal(validate(createPayload({ cnpj: '11.222.333/0001-811' })), false)
    assert.equal(validate(createPayload({ phone: '119999988' })), false)
    assert.equal(validate(createPayload({ phone: '1'.repeat(21) })), false)
  })

  test('recusa propriedade extra', () => {
    assert.equal(validate(createPayload({ status: 'approved' })), false)
  })
})
