// Testes unitários das regras do autocadastro de organizador.

import assert from 'node:assert/strict'
import { afterEach, describe, test } from 'node:test'

import { UniqueConstraintError } from 'sequelize'

import { AuthController } from '../../src/controllers/auth_controller.js'
import { CnpjAlreadyRegistered, EmailAlreadyRegistered, InvalidCnpj, InvalidParameter } from '../../src/errors/index.js'
import { OrganizerRepository } from '../../src/repositories/organizer_repository.js'
import { UserRepository } from '../../src/repositories/user_repository.js'
import { SecurityTools } from '../../src/utils/security_tools.js'

const originalGetByEmail = UserRepository.prototype.getByEmail
const originalCreateUser = UserRepository.prototype.create
const originalGetByCnpj = OrganizerRepository.prototype.getByCnpj
const originalCreateOrganizer = OrganizerRepository.prototype.create
const originalHashPassword = SecurityTools.hashPassword

afterEach(() => {
  UserRepository.prototype.getByEmail = originalGetByEmail
  UserRepository.prototype.create = originalCreateUser
  OrganizerRepository.prototype.getByCnpj = originalGetByCnpj
  OrganizerRepository.prototype.create = originalCreateOrganizer
  SecurityTools.hashPassword = originalHashPassword
})

function createControllerContext() {
  let commitCount = 0
  const operations = []
  const context = {
    dbSession: {
      async commit() {
        commitCount += 1
        operations.push('commit')
      },
    },
  }

  return { context, getCommitCount: () => commitCount, operations }
}

function createPayload(overrides = {}) {
  return {
    name: 'Maria Organizadora',
    email: '  Maria@Exemplo.COM ',
    password: 'senhaForte123',
    cnpj: '11.222.333/0001-81',
    phone: '(11) 99999-8888',
    ...overrides,
  }
}

// Repositórios sem cadastro existente, que registram o que foi buscado e gravado.
function mockEmptyRepositories(operations) {
  const calls = {}
  UserRepository.prototype.getByEmail = async (email) => {
    calls.emailSearched = email
    return null
  }
  OrganizerRepository.prototype.getByCnpj = async (cnpj) => {
    calls.cnpjSearched = cnpj
    return null
  }
  SecurityTools.hashPassword = async (password) => `hash-de-${password}`
  UserRepository.prototype.create = async (values) => {
    calls.userValues = values
    operations.push('createUser')
    return { id: 15, user_key: 'new-user-key', profile: values.profile, status: 'pending', password_hash: values.passwordHash }
  }
  OrganizerRepository.prototype.create = async (values) => {
    calls.organizerValues = values
    operations.push('createOrganizer')
    return { id: 7, ...values }
  }
  return calls
}

describe('AuthController.registerOrganizer', () => {
  test('cadastra usuário e organizador normalizados e confirma só no final', async () => {
    const { context, getCommitCount, operations } = createControllerContext()
    const calls = mockEmptyRepositories(operations)

    const controller = new AuthController(context)
    const result = await controller.registerOrganizer(createPayload())

    assert.deepEqual(result, { user_key: 'new-user-key', profile: 'organizador', status: 'pending' })
    assert.equal(Object.hasOwn(result, 'id'), false)
    assert.equal(Object.hasOwn(result, 'password_hash'), false)
    assert.equal(calls.emailSearched, 'maria@exemplo.com')
    assert.equal(calls.cnpjSearched, '11222333000181')
    assert.deepEqual(calls.userValues, {
      name: 'Maria Organizadora',
      email: 'maria@exemplo.com',
      passwordHash: 'hash-de-senhaForte123',
      profile: 'organizador',
    })
    assert.deepEqual(calls.organizerValues, { userId: 15, cnpj: '11222333000181', phone: '11999998888' })
    assert.deepEqual(operations, ['createUser', 'createOrganizer', 'commit'])
    assert.equal(getCommitCount(), 1)
  })

  test('aceita telefone fixo com 10 dígitos', async () => {
    const { context, getCommitCount, operations } = createControllerContext()
    const calls = mockEmptyRepositories(operations)

    const controller = new AuthController(context)
    await controller.registerOrganizer(createPayload({ phone: '(11) 3333-4444' }))

    assert.equal(calls.organizerValues.phone, '1133334444')
    assert.equal(getCommitCount(), 1)
  })

  test('e-mail já cadastrado gera 409 sem gravar nem confirmar', async () => {
    const { context, getCommitCount, operations } = createControllerContext()
    mockEmptyRepositories(operations)
    UserRepository.prototype.getByEmail = async () => ({ id: 3 })

    const controller = new AuthController(context)
    await assert.rejects(() => controller.registerOrganizer(createPayload()), EmailAlreadyRegistered)

    assert.deepEqual(operations, [])
    assert.equal(getCommitCount(), 0)
  })

  test('CNPJ já cadastrado gera 409 sem gravar nem confirmar', async () => {
    const { context, getCommitCount, operations } = createControllerContext()
    mockEmptyRepositories(operations)
    OrganizerRepository.prototype.getByCnpj = async () => ({ id: 4 })

    const controller = new AuthController(context)
    await assert.rejects(() => controller.registerOrganizer(createPayload()), CnpjAlreadyRegistered)

    assert.deepEqual(operations, [])
    assert.equal(getCommitCount(), 0)
  })

  test('CNPJ inválido gera 400 antes de consultar o banco', async () => {
    const { context, getCommitCount, operations } = createControllerContext()
    const calls = mockEmptyRepositories(operations)

    const controller = new AuthController(context)
    await assert.rejects(() => controller.registerOrganizer(createPayload({ cnpj: '11.222.333/0001-82' })), InvalidCnpj)
    await assert.rejects(() => controller.registerOrganizer(createPayload({ cnpj: '00.000.000/0000-00' })), InvalidCnpj)

    assert.equal(calls.emailSearched, undefined)
    assert.deepEqual(operations, [])
    assert.equal(getCommitCount(), 0)
  })

  test('telefone sem 10 ou 11 dígitos gera 400 antes de consultar o banco', async () => {
    const { context, getCommitCount, operations } = createControllerContext()
    const calls = mockEmptyRepositories(operations)

    const controller = new AuthController(context)
    await assert.rejects(() => controller.registerOrganizer(createPayload({ phone: '9999-8888' })), InvalidParameter)
    await assert.rejects(() => controller.registerOrganizer(createPayload({ phone: '(11) 99999-88887' })), InvalidParameter)

    assert.equal(calls.emailSearched, undefined)
    assert.deepEqual(operations, [])
    assert.equal(getCommitCount(), 0)
  })

  test('UNIQUE de e-mail no banco (corrida) vira 409 de e-mail sem confirmar', async () => {
    const { context, getCommitCount, operations } = createControllerContext()
    mockEmptyRepositories(operations)
    UserRepository.prototype.create = async () => {
      throw new UniqueConstraintError({ fields: { email: 'maria@exemplo.com' } })
    }

    const controller = new AuthController(context)
    await assert.rejects(() => controller.registerOrganizer(createPayload()), EmailAlreadyRegistered)

    assert.equal(getCommitCount(), 0)
  })

  test('UNIQUE de CNPJ no banco (corrida) vira 409 de CNPJ sem confirmar', async () => {
    const { context, getCommitCount, operations } = createControllerContext()
    mockEmptyRepositories(operations)
    OrganizerRepository.prototype.create = async () => {
      throw new UniqueConstraintError({ fields: { cnpj: '11222333000181' } })
    }

    const controller = new AuthController(context)
    await assert.rejects(() => controller.registerOrganizer(createPayload()), CnpjAlreadyRegistered)

    assert.deepEqual(operations, ['createUser'])
    assert.equal(getCommitCount(), 0)
  })

  test('outro erro do banco é repassado sem confirmar', async () => {
    const { context, getCommitCount, operations } = createControllerContext()
    mockEmptyRepositories(operations)
    OrganizerRepository.prototype.create = async () => {
      throw new Error('database write failed')
    }

    const controller = new AuthController(context)
    await assert.rejects(() => controller.registerOrganizer(createPayload()), /database write failed/)

    assert.equal(getCommitCount(), 0)
  })
})
