// Testes unitários do model de organizador.

import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { Organizer, User } from '../../src/models/index.js'

describe('Organizer model', () => {
  test('mapeia a tabela organizer e suas colunas persistidas', () => {
    assert.equal(Organizer.tableName, 'organizer')
    assert.equal(Organizer.options.timestamps, false)

    for (const attribute of ['id', 'user_id', 'cnpj', 'phone', 'created_at']) {
      assert.ok(Organizer.rawAttributes[attribute], `coluna ${attribute} existe no model Organizer`)
    }
  })

  test('define o tamanho do CNPJ e do telefone', () => {
    assert.equal(Organizer.rawAttributes.cnpj.type.options.length, 14)
    assert.equal(Organizer.rawAttributes.phone.type.options.length, 20)
  })

  test('associa o organizador ao usuário nos dois sentidos', () => {
    assert.equal(Organizer.associations.user.target, User)
    assert.equal(Organizer.associations.user.foreignKey, 'user_id')
    assert.equal(User.associations.organizer.target, Organizer)
    assert.equal(User.associations.organizer.associationType, 'HasOne')
    assert.equal(User.associations.organizer.foreignKey, 'user_id')
  })
})
