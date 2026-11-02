import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { ItemCategory, Supplier, SupplierCategory, User } from '../../src/models/index.js'

describe('Supplier model', () => {
  test('mapeia a tabela supplier e suas colunas persistidas', () => {
    assert.equal(Supplier.tableName, 'supplier')
    assert.equal(Supplier.options.timestamps, false)

    for (const attribute of ['id', 'user_id', 'cnpj', 'phone', 'responsible_name', 'city', 'state', 'created_at']) {
      assert.ok(Supplier.rawAttributes[attribute], `coluna ${attribute} existe no model Supplier`)
    }
  })

  test('define o tamanho do CNPJ, do telefone e da UF', () => {
    assert.equal(Supplier.rawAttributes.cnpj.type.options.length, 14)
    assert.equal(Supplier.rawAttributes.phone.type.options.length, 20)
    assert.equal(Supplier.rawAttributes.state.type.options.length, 2)
  })

  test('liga o fornecedor às categorias pela tabela supplier_category', () => {
    const categories = Supplier.associations.categories
    assert.equal(categories.associationType, 'BelongsToMany')
    assert.equal(categories.target, ItemCategory)
    assert.equal(categories.through.model, SupplierCategory)
    assert.equal(categories.foreignKey, 'supplier_id')
    assert.equal(categories.otherKey, 'category_id')
  })

  test('associa o fornecedor ao usuário nos dois sentidos', () => {
    assert.equal(Supplier.associations.user.target, User)
    assert.equal(Supplier.associations.user.foreignKey, 'user_id')
    assert.equal(User.associations.supplier.target, Supplier)
    assert.equal(User.associations.supplier.associationType, 'HasOne')
    assert.equal(User.associations.supplier.foreignKey, 'user_id')
  })
})
