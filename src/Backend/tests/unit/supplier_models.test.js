// Testes unitários do model de fornecedor.

import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { Supplier, User } from '../../src/models/index.js'

describe('Supplier model', () => {
  test('mapeia a tabela supplier e suas colunas persistidas', () => {
    assert.equal(Supplier.tableName, 'supplier')
    assert.equal(Supplier.options.timestamps, false)

    for (const attribute of ['id', 'user_id', 'cnpj', 'service_area', 'phone', 'created_at']) {
      assert.ok(Supplier.rawAttributes[attribute], `coluna ${attribute} existe no model Supplier`)
    }
  })

  test('define o tamanho do CNPJ, da área de atuação e do telefone', () => {
    assert.equal(Supplier.rawAttributes.cnpj.type.options.length, 14)
    assert.equal(Supplier.rawAttributes.service_area.type.options.length, 100)
    assert.equal(Supplier.rawAttributes.phone.type.options.length, 20)
  })

  test('associa o fornecedor ao usuário nos dois sentidos', () => {
    assert.equal(Supplier.associations.user.target, User)
    assert.equal(Supplier.associations.user.foreignKey, 'user_id')
    assert.equal(User.associations.supplier.target, Supplier)
    assert.equal(User.associations.supplier.associationType, 'HasOne')
    assert.equal(User.associations.supplier.foreignKey, 'user_id')
  })
})
