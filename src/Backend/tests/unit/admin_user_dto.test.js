// Testes unitários do DTO devolvido após uma decisão administrativa.

import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { AdminUserDTO } from '../../src/dtos/admin_user_dto.js'

describe('AdminUserDTO', () => {
  test('devolve apenas a chave pública e o status atualizado', () => {
    const user = {
      id: 31,
      user_key: 'user-public-key',
      name: 'Pessoa de teste',
      email: 'pessoa@example.test',
      password_hash: 'hash que não deve vazar',
      profile: 'organizador',
      status: 'approved',
      approved_at: new Date('2026-01-01T12:00:00.000Z'),
      created_at: new Date('2025-12-01T12:00:00.000Z'),
    }

    assert.deepEqual(AdminUserDTO.statusUpdate(user), {
      user_key: 'user-public-key',
      status: 'approved',
    })
  })
})
