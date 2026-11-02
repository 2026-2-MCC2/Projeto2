// Testes unitários das regras do autocadastro (organizador e fornecedor) e do login.

import assert from 'node:assert/strict'
import { afterEach, describe, test } from 'node:test'

import { UniqueConstraintError } from 'sequelize'

import { AuthController } from '../../src/controllers/auth_controller.js'
import {
  CnpjAlreadyRegistered,
  EmailAlreadyRegistered,
  InvalidCnpj,
  InvalidCredentials,
  InvalidParameter,
  RegistrationPending,
  RegistrationRejected,
} from '../../src/errors/index.js'
import { OrganizerRepository } from '../../src/repositories/organizer_repository.js'
import { SupplierRepository } from '../../src/repositories/supplier_repository.js'
import { UserRepository } from '../../src/repositories/user_repository.js'
import { SecurityTools } from '../../src/utils/security_tools.js'

const originalGetByEmail = UserRepository.prototype.getByEmail
const originalCreateUser = UserRepository.prototype.create
const originalGetByCnpj = OrganizerRepository.prototype.getByCnpj
const originalCreateOrganizer = OrganizerRepository.prototype.create
const originalGetSupplierByCnpj = SupplierRepository.prototype.getByCnpj
const originalCreateSupplier = SupplierRepository.prototype.create
const originalHashPassword = SecurityTools.hashPassword

afterEach(() => {
  UserRepository.prototype.getByEmail = originalGetByEmail
  UserRepository.prototype.create = originalCreateUser
  OrganizerRepository.prototype.getByCnpj = originalGetByCnpj
  OrganizerRepository.prototype.create = originalCreateOrganizer
  SupplierRepository.prototype.getByCnpj = originalGetSupplierByCnpj
  SupplierRepository.prototype.create = originalCreateSupplier
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
    profile: 'organizador',
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
  SupplierRepository.prototype.getByCnpj = async (cnpj) => {
    calls.supplierCnpjSearched = cnpj
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
  SupplierRepository.prototype.create = async (values) => {
    calls.supplierValues = values
    operations.push('createSupplier')
    return { id: 8, ...values }
  }
  return calls
}

describe('AuthController.register (organizador)', () => {
  test('cadastra usuário e organizador normalizados e confirma só no final', async () => {
    const { context, getCommitCount, operations } = createControllerContext()
    const calls = mockEmptyRepositories(operations)

    const controller = new AuthController(context)
    const result = await controller.register(createPayload())

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
    await controller.register(createPayload({ phone: '(11) 3333-4444' }))

    assert.equal(calls.organizerValues.phone, '1133334444')
    assert.equal(getCommitCount(), 1)
  })

  test('e-mail já cadastrado gera 409 sem gravar nem confirmar', async () => {
    const { context, getCommitCount, operations } = createControllerContext()
    mockEmptyRepositories(operations)
    UserRepository.prototype.getByEmail = async () => ({ id: 3 })

    const controller = new AuthController(context)
    await assert.rejects(() => controller.register(createPayload()), EmailAlreadyRegistered)

    assert.deepEqual(operations, [])
    assert.equal(getCommitCount(), 0)
  })

  test('CNPJ já cadastrado gera 409 sem gravar nem confirmar', async () => {
    const { context, getCommitCount, operations } = createControllerContext()
    mockEmptyRepositories(operations)
    OrganizerRepository.prototype.getByCnpj = async () => ({ id: 4 })

    const controller = new AuthController(context)
    await assert.rejects(() => controller.register(createPayload()), CnpjAlreadyRegistered)

    assert.deepEqual(operations, [])
    assert.equal(getCommitCount(), 0)
  })

  test('CNPJ inválido gera 400 antes de consultar o banco', async () => {
    const { context, getCommitCount, operations } = createControllerContext()
    const calls = mockEmptyRepositories(operations)

    const controller = new AuthController(context)
    await assert.rejects(() => controller.register(createPayload({ cnpj: '11.222.333/0001-82' })), InvalidCnpj)
    await assert.rejects(() => controller.register(createPayload({ cnpj: '00.000.000/0000-00' })), InvalidCnpj)

    assert.equal(calls.emailSearched, undefined)
    assert.deepEqual(operations, [])
    assert.equal(getCommitCount(), 0)
  })

  test('telefone sem 10 ou 11 dígitos gera 400 antes de consultar o banco', async () => {
    const { context, getCommitCount, operations } = createControllerContext()
    const calls = mockEmptyRepositories(operations)

    const controller = new AuthController(context)
    await assert.rejects(() => controller.register(createPayload({ phone: '9999-8888' })), InvalidParameter)
    await assert.rejects(() => controller.register(createPayload({ phone: '(11) 99999-88887' })), InvalidParameter)

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
    await assert.rejects(() => controller.register(createPayload()), EmailAlreadyRegistered)

    assert.equal(getCommitCount(), 0)
  })

  test('UNIQUE de CNPJ no banco (corrida) vira 409 de CNPJ sem confirmar', async () => {
    const { context, getCommitCount, operations } = createControllerContext()
    mockEmptyRepositories(operations)
    OrganizerRepository.prototype.create = async () => {
      throw new UniqueConstraintError({ fields: { cnpj: '11222333000181' } })
    }

    const controller = new AuthController(context)
    await assert.rejects(() => controller.register(createPayload()), CnpjAlreadyRegistered)

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
    await assert.rejects(() => controller.register(createPayload()), /database write failed/)

    assert.equal(getCommitCount(), 0)
  })
})

describe('AuthController.register (fornecedor)', () => {
  function createSupplierPayload(overrides = {}) {
    return createPayload({ profile: 'fornecedor', name: 'Som e Luz Ltda.', service_area: 'Estrutura', ...overrides })
  }

  test('cadastra usuário fornecedor pendente e supplier com a área de atuação, confirmando só no final', async () => {
    const { context, getCommitCount, operations } = createControllerContext()
    const calls = mockEmptyRepositories(operations)

    const controller = new AuthController(context)
    const result = await controller.register(createSupplierPayload())

    assert.deepEqual(result, { user_key: 'new-user-key', profile: 'fornecedor', status: 'pending' })
    assert.equal(calls.userValues.profile, 'fornecedor')
    assert.equal(calls.userValues.email, 'maria@exemplo.com')
    assert.deepEqual(calls.supplierValues, { userId: 15, cnpj: '11222333000181', phone: '11999998888', serviceArea: 'Estrutura' })
    assert.equal(calls.organizerValues, undefined)
    assert.deepEqual(operations, ['createUser', 'createSupplier', 'commit'])
    assert.equal(getCommitCount(), 1)
  })

  test('organizador não grava supplier nem área de atuação', async () => {
    const { context, operations } = createControllerContext()
    const calls = mockEmptyRepositories(operations)

    const controller = new AuthController(context)
    await controller.register(createPayload())

    assert.deepEqual(calls.organizerValues, { userId: 15, cnpj: '11222333000181', phone: '11999998888' })
    assert.equal(calls.supplierValues, undefined)
  })

  test('CNPJ já usado por um organizador barra o fornecedor com 409', async () => {
    const { context, getCommitCount, operations } = createControllerContext()
    mockEmptyRepositories(operations)
    OrganizerRepository.prototype.getByCnpj = async () => ({ id: 4 })

    const controller = new AuthController(context)
    await assert.rejects(() => controller.register(createSupplierPayload()), CnpjAlreadyRegistered)

    assert.deepEqual(operations, [])
    assert.equal(getCommitCount(), 0)
  })

  test('CNPJ já usado por um fornecedor barra o organizador com 409', async () => {
    const { context, getCommitCount, operations } = createControllerContext()
    const calls = mockEmptyRepositories(operations)
    SupplierRepository.prototype.getByCnpj = async () => ({ id: 5 })

    const controller = new AuthController(context)
    await assert.rejects(() => controller.register(createPayload()), CnpjAlreadyRegistered)

    assert.equal(calls.cnpjSearched, '11222333000181')
    assert.deepEqual(operations, [])
    assert.equal(getCommitCount(), 0)
  })

  test('e-mail já cadastrado barra o fornecedor com 409', async () => {
    const { context, getCommitCount, operations } = createControllerContext()
    mockEmptyRepositories(operations)
    UserRepository.prototype.getByEmail = async () => ({ id: 3 })

    const controller = new AuthController(context)
    await assert.rejects(() => controller.register(createSupplierPayload()), EmailAlreadyRegistered)

    assert.equal(getCommitCount(), 0)
  })

  test('UNIQUE de CNPJ no supplier (corrida) vira 409 de CNPJ sem confirmar', async () => {
    const { context, getCommitCount, operations } = createControllerContext()
    mockEmptyRepositories(operations)
    SupplierRepository.prototype.create = async () => {
      throw new UniqueConstraintError({ fields: { cnpj: '11222333000181' } })
    }

    const controller = new AuthController(context)
    await assert.rejects(() => controller.register(createSupplierPayload()), CnpjAlreadyRegistered)

    assert.equal(getCommitCount(), 0)
  })

  test('perfil admin não faz autocadastro', async () => {
    const { context, getCommitCount, operations } = createControllerContext()
    mockEmptyRepositories(operations)

    const controller = new AuthController(context)
    await assert.rejects(() => controller.register(createPayload({ profile: 'admin' })), InvalidParameter)

    assert.deepEqual(operations, [])
    assert.equal(getCommitCount(), 0)
  })
})

describe('AuthController.login', () => {
  const originalCheckPassword = SecurityTools.checkPassword
  const originalGenerateUserToken = SecurityTools.generateUserToken

  afterEach(() => {
    SecurityTools.checkPassword = originalCheckPassword
    SecurityTools.generateUserToken = originalGenerateUserToken
  })

  function createUser(status) {
    return {
      id: 15,
      user_key: 'user-key',
      name: 'Maria Organizadora',
      email: 'maria@exemplo.com',
      password_hash: 'hash-da-senha',
      profile: 'organizador',
      status: status,
    }
  }

  // senha certa é 'senhaForte123'; registra contra qual hash a senha foi conferida
  function mockPasswordAndToken() {
    const calls = {}
    SecurityTools.checkPassword = async (password, passwordHash) => {
      calls.checkedHash = passwordHash
      return password === 'senhaForte123'
    }
    SecurityTools.generateUserToken = async (tokenData) => {
      calls.tokenData = tokenData
      return 'token-gerado'
    }
    return calls
  }

  test('usuário aprovado recebe token e dados públicos, sem confirmar transação', async () => {
    const { context, getCommitCount } = createControllerContext()
    const calls = mockPasswordAndToken()
    let searchedEmail
    UserRepository.prototype.getByEmail = async (email) => {
      searchedEmail = email
      return createUser('approved')
    }

    const controller = new AuthController(context)
    const result = await controller.login({ email: '  Maria@Exemplo.COM ', password: 'senhaForte123' })

    assert.equal(searchedEmail, 'maria@exemplo.com')
    assert.equal(calls.checkedHash, 'hash-da-senha')
    assert.deepEqual(calls.tokenData, { userKey: 'user-key', profile: 'organizador' })
    assert.deepEqual(result, {
      token: 'token-gerado',
      user: { user_key: 'user-key', name: 'Maria Organizadora', profile: 'organizador' },
    })
    assert.equal(getCommitCount(), 0)
  })

  test('senha errada gera 401 sem gerar token', async () => {
    const { context } = createControllerContext()
    const calls = mockPasswordAndToken()
    UserRepository.prototype.getByEmail = async () => createUser('approved')

    const controller = new AuthController(context)
    await assert.rejects(() => controller.login({ email: 'maria@exemplo.com', password: 'errada123' }), InvalidCredentials)

    assert.equal(calls.tokenData, undefined)
  })

  test('e-mail inexistente gera o mesmo 401 e ainda confere a senha (tempo igual)', async () => {
    const { context } = createControllerContext()
    const calls = mockPasswordAndToken()
    UserRepository.prototype.getByEmail = async () => null

    const controller = new AuthController(context)
    await assert.rejects(() => controller.login({ email: 'ninguem@exemplo.com', password: 'senhaForte123' }), InvalidCredentials)

    assert.match(calls.checkedHash, /^\$2b\$10\$/)
    assert.equal(calls.tokenData, undefined)
  })

  test('cadastro pendente gera 403 de análise', async () => {
    const { context } = createControllerContext()
    const calls = mockPasswordAndToken()
    UserRepository.prototype.getByEmail = async () => createUser('pending')

    const controller = new AuthController(context)
    await assert.rejects(() => controller.login({ email: 'maria@exemplo.com', password: 'senhaForte123' }), RegistrationPending)

    assert.equal(calls.tokenData, undefined)
  })

  test('cadastro rejeitado gera 403 de não aprovado', async () => {
    const { context } = createControllerContext()
    const calls = mockPasswordAndToken()
    UserRepository.prototype.getByEmail = async () => createUser('rejected')

    const controller = new AuthController(context)
    await assert.rejects(() => controller.login({ email: 'maria@exemplo.com', password: 'senhaForte123' }), RegistrationRejected)

    assert.equal(calls.tokenData, undefined)
  })

  test('cadastro pendente com senha errada gera 401, sem revelar o status', async () => {
    const { context } = createControllerContext()
    mockPasswordAndToken()
    UserRepository.prototype.getByEmail = async () => createUser('pending')

    const controller = new AuthController(context)
    await assert.rejects(() => controller.login({ email: 'maria@exemplo.com', password: 'errada123' }), InvalidCredentials)
  })
})
