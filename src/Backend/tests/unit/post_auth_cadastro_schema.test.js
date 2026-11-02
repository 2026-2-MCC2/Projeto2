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

  test('aceita fornecedor com todas as categorias de atuação', () => {
    const categories = [
      'Alimentação',
      'Bebidas',
      'Comunicação',
      'Decoração',
      'Equipe',
      'Estrutura',
      'Logística',
      'Segurança',
      'Tecnologia',
      'Outros',
    ]
    assert.equal(validate(createPayload({ profile: 'fornecedor', categories })), true)
  })

  test('recusa fornecedor sem categorias de atuação', () => {
    assert.equal(validate(createPayload({ profile: 'fornecedor' })), false)
    assert.equal(validate.errors[0].params.missingProperty, 'categories')
    assert.equal(validate(createPayload({ profile: 'fornecedor', categories: [] })), false)
  })

  test('recusa categoria fora da lista ou repetida', () => {
    assert.equal(validate(createPayload({ profile: 'fornecedor', categories: ['Som'] })), false)
    assert.equal(validate(createPayload({ profile: 'fornecedor', categories: ['estrutura'] })), false)
    assert.equal(validate(createPayload({ profile: 'fornecedor', categories: ['Estrutura', 'Estrutura'] })), false)
  })

  test('recusa organizador com categorias de atuação', () => {
    assert.equal(validate(createPayload({ categories: ['Estrutura'] })), false)
    assert.equal(validate.errors[0].instancePath, '/categories')
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
