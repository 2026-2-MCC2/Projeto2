import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { AuthDTO } from '../../src/dtos/auth_dto.js'

describe('AuthDTO', () => {
  test('registration expõe só user_key, perfil e status', () => {
    const user = {
      id: 15,
      user_key: 'new-user-key',
      name: 'Maria Organizadora',
      email: 'maria@exemplo.com',
      password_hash: 'hash-secreto',
      profile: 'organizador',
      status: 'pending',
    }

    assert.deepEqual(AuthDTO.registration(user), { user_key: 'new-user-key', profile: 'organizador', status: 'pending' })
  })
})

describe('AuthDTO.login', () => {
  test('devolve o token e só user_key, nome e perfil do usuário', () => {
    const user = {
      id: 15,
      user_key: 'user-key',
      name: 'Maria Organizadora',
      email: 'maria@exemplo.com',
      password_hash: 'hash-secreto',
      profile: 'organizador',
      status: 'approved',
    }

    assert.deepEqual(AuthDTO.login(user, 'token-gerado'), {
      token: 'token-gerado',
      user: { user_key: 'user-key', name: 'Maria Organizadora', profile: 'organizador' },
    })
  })
})
