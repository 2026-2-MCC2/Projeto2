import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, test } from 'node:test'

import Ajv from 'ajv'

const schemaPath = new URL('../../src/schemas/post_supplier_proposal.json', import.meta.url)
const validate = new Ajv().compile(JSON.parse(readFileSync(schemaPath, 'utf8')))

function createPayload(overrides = {}) {
  return {
    amount: 1500,
    description: 'Palco 10x8 com cobertura',
    delivery_terms: 'Montagem na véspera',
    payment_terms: '50% na assinatura',
    valid_until: '2027-01-15',
    ...overrides,
  }
}

describe('POST supplier proposal schema', () => {
  test('aceita só os obrigatórios e também com todos os opcionais', () => {
    assert.equal(validate(createPayload()), true)
    assert.equal(validate(createPayload({ not_included: 'Gerador', team: '4 pessoas', warranty: '30 dias', notes: 'Inclui frete' })), true)
  })

  test('recusa cada campo obrigatório faltando', () => {
    for (const field of ['amount', 'description', 'delivery_terms', 'payment_terms', 'valid_until']) {
      const payload = createPayload()
      delete payload[field]
      assert.equal(validate(payload), false, `campo ${field} é obrigatório`)
    }
  })

  test('recusa valor zero, negativo ou como texto', () => {
    assert.equal(validate(createPayload({ amount: 0 })), false)
    assert.equal(validate(createPayload({ amount: -10 })), false)
    assert.equal(validate(createPayload({ amount: '1500' })), false)
    assert.equal(validate(createPayload({ amount: 0.01 })), true)
  })

  test('recusa textos obrigatórios vazios ou só com espaços', () => {
    assert.equal(validate(createPayload({ description: '' })), false)
    assert.equal(validate(createPayload({ delivery_terms: '   ' })), false)
    assert.equal(validate(createPayload({ payment_terms: '' })), false)
  })

  test('respeita os tamanhos das colunas do banco', () => {
    assert.equal(validate(createPayload({ delivery_terms: 'a'.repeat(255) })), true)
    assert.equal(validate(createPayload({ delivery_terms: 'a'.repeat(256) })), false)
    assert.equal(validate(createPayload({ payment_terms: 'a'.repeat(256) })), false)
    assert.equal(validate(createPayload({ team: 'a'.repeat(256) })), false)
    assert.equal(validate(createPayload({ warranty: 'a'.repeat(256) })), false)
    assert.equal(validate(createPayload({ not_included: 'a'.repeat(500) })), true)
    assert.equal(validate(createPayload({ not_included: 'a'.repeat(501) })), false)
  })

  test('recusa validade fora do formato AAAA-MM-DD', () => {
    assert.equal(validate(createPayload({ valid_until: '15/01/2027' })), false)
    assert.equal(validate(createPayload({ valid_until: '2027-13-01' })), false)
    assert.equal(validate(createPayload({ valid_until: '2027-01-15T00:00:00Z' })), false)
  })

  test('recusa propriedade extra', () => {
    assert.equal(validate(createPayload({ status: 'accepted' })), false)
    assert.equal(validate(createPayload({ selected: true })), false)
  })
})
