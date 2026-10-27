// Testes de unidade do SecurityTools: chamam as funções direto, sem fazer requisição HTTP.
// (Testes de integração, em tests/integration/, fazem requisições de verdade para a API.)

import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { USER_PROFILES } from '../../src/constants.js'
import { ForbiddenProfile } from '../../src/errors/index.js'
import { SecurityTools } from '../../src/utils/security_tools.js'

describe('SecurityTools - senha', () => {
  test('o hash não é a senha original', async () => {
    const passwordHash = await SecurityTools.hashPassword('minhaSenha123')
    assert.notEqual(passwordHash, 'minhaSenha123')
  })

  test('confere a senha certa e recusa a errada', async () => {
    const passwordHash = await SecurityTools.hashPassword('minhaSenha123')

    assert.equal(await SecurityTools.checkPassword('minhaSenha123', passwordHash), true)
    assert.equal(await SecurityTools.checkPassword('senhaErrada', passwordHash), false)
  })
})

describe('SecurityTools - perfil', () => {
  test('perfil permitido passa', () => {
    const context = { user: { userKey: 'abc', profile: USER_PROFILES.ORGANIZER } }
    SecurityTools.requireProfile(context, [USER_PROFILES.ORGANIZER, USER_PROFILES.ADMIN])
  })

  test('perfil não permitido é barrado com 403', () => {
    const context = { user: { userKey: 'abc', profile: USER_PROFILES.SUPPLIER } }
    assert.throws(() => SecurityTools.requireProfile(context, [USER_PROFILES.ORGANIZER]), ForbiddenProfile)
  })
})
