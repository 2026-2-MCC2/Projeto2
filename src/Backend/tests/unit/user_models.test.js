// Testes unitários dos models de usuário e do histórico administrativo.

import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { User, UserStatusEvent } from '../../src/models/index.js'

describe('User model', () => {
  test('mapeia a tabela user e suas colunas persistidas', () => {
    assert.equal(User.tableName, 'user')
    assert.equal(User.options.timestamps, false)

    for (const attribute of ['id', 'user_key', 'name', 'email', 'password_hash', 'profile', 'status', 'approved_at', 'created_at']) {
      assert.ok(User.rawAttributes[attribute], `coluna ${attribute} existe no model User`)
    }
  })

  test('define os valores válidos de perfil e status', () => {
    assert.deepEqual(User.rawAttributes.profile.type.values, ['admin', 'organizador', 'fornecedor'])
    assert.deepEqual(User.rawAttributes.status.type.values, ['pending', 'approved', 'rejected'])
  })
})

describe('UserStatusEvent model', () => {
  test('mapeia a tabela de histórico e suas colunas', () => {
    assert.equal(UserStatusEvent.tableName, 'user_status_event')
    assert.equal(UserStatusEvent.options.timestamps, false)

    for (const attribute of ['id', 'user_id', 'admin_user_id', 'old_status', 'new_status', 'event_datetime', 'created_at']) {
      assert.ok(UserStatusEvent.rawAttributes[attribute], `coluna ${attribute} existe no model UserStatusEvent`)
    }
  })

  test('associa o usuário afetado e o administrador responsável', () => {
    assert.equal(UserStatusEvent.associations.user.target, User)
    assert.equal(UserStatusEvent.associations.administrator.target, User)
    assert.equal(User.associations.status_events.target, UserStatusEvent)
    assert.equal(User.associations.admin_status_events.target, UserStatusEvent)
  })
})
