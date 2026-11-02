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

describe('AdminUserDTO.registration', () => {
  const baseUser = {
    id: 31,
    user_key: 'user-public-key',
    name: 'Empresa de teste',
    email: 'empresa@example.test',
    password_hash: 'hash que não deve vazar',
    status: 'pending',
    approved_at: null,
    created_at: new Date('2026-11-02T12:00:00.000Z'),
  }

  test('organizador traz cnpj e telefone do organizer e nunca id ou hash', () => {
    const user = {
      ...baseUser,
      profile: 'organizador',
      organizer: { id: 4, cnpj: '11222333000181', phone: '11999998888' },
      supplier: null,
    }

    assert.deepEqual(AdminUserDTO.registration(user), {
      user_key: 'user-public-key',
      name: 'Empresa de teste',
      profile: 'organizador',
      email: 'empresa@example.test',
      status: 'pending',
      created_at: baseUser.created_at,
      cnpj: '11222333000181',
      phone: '11999998888',
      service_area: null,
    })
  })

  test('fornecedor traz cnpj, telefone e área de atuação do supplier', () => {
    const user = {
      ...baseUser,
      profile: 'fornecedor',
      organizer: null,
      supplier: { id: 5, cnpj: '11444777000161', phone: '1133334444', service_area: 'Segurança' },
    }

    const dto = AdminUserDTO.registration(user)

    assert.equal(dto.cnpj, '11444777000161')
    assert.equal(dto.phone, '1133334444')
    assert.equal(dto.service_area, 'Segurança')
    assert.equal(Object.hasOwn(dto, 'id'), false)
  })

  test('cadastro sem dados de perfil devolve cnpj e telefone nulos', () => {
    const dto = AdminUserDTO.registration({ ...baseUser, profile: 'organizador', organizer: null, supplier: null })

    assert.equal(dto.cnpj, null)
    assert.equal(dto.phone, null)
  })

  test('registrationList converte cada usuário', () => {
    const users = [
      { ...baseUser, user_key: 'a', profile: 'organizador', organizer: null, supplier: null },
      { ...baseUser, user_key: 'b', profile: 'fornecedor', organizer: null, supplier: null },
    ]

    assert.deepEqual(
      AdminUserDTO.registrationList(users).map((dto) => dto.user_key),
      ['a', 'b'],
    )
  })
})
