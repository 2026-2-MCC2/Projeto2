import assert from 'node:assert/strict'
import { afterEach, describe, test } from 'node:test'

import { ForbiddenProfile, InvalidParameter, NotFoundUser, UserStatusConflict } from '../../src/errors/index.js'
import { UserRepository } from '../../src/repositories/user_repository.js'
import { AdminUserController } from '../../src/controllers/admin_user_controller.js'

const originalGetByKeyForUpdate = UserRepository.prototype.getByKeyForUpdate
const originalUpdateStatus = UserRepository.prototype.updateStatus

afterEach(() => {
  UserRepository.prototype.getByKeyForUpdate = originalGetByKeyForUpdate
  UserRepository.prototype.updateStatus = originalUpdateStatus
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
    user: { userKey: 'admin-user-key', profile: 'admin' },
  }

  return { context, getCommitCount: () => commitCount, operations }
}

describe('AdminUserController', () => {
  test('aprova organizador pendente e confirma só depois da atualização', async () => {
    const target = { id: 15, user_key: 'organizer-key', profile: 'organizador', status: 'pending' }
    const { context, getCommitCount, operations } = createControllerContext()
    let updateArguments

    UserRepository.prototype.getByKeyForUpdate = async () => target
    UserRepository.prototype.updateStatus = async (...args) => {
      updateArguments = args
      operations.push('update')
      target.status = args[1]
      return target
    }

    const controller = new AdminUserController(context)
    const result = await controller.decideStatus(target.user_key, 'approved')

    assert.deepEqual(result, { user_key: target.user_key, status: 'approved' })
    assert.equal(Object.hasOwn(result, 'id'), false)
    assert.equal(Object.hasOwn(result, 'password_hash'), false)
    assert.deepEqual(updateArguments, [target, 'approved', null])
    assert.deepEqual(operations, ['update', 'commit'])
    assert.equal(getCommitCount(), 1)
  })

  test('rejeita fornecedor pendente', async () => {
    const target = { id: 16, user_key: 'supplier-key', profile: 'fornecedor', status: 'pending' }
    const { context, getCommitCount } = createControllerContext()
    let requestedStatus
    let requestedReason

    UserRepository.prototype.getByKeyForUpdate = async () => target
    UserRepository.prototype.updateStatus = async (user, newStatus, reason) => {
      requestedStatus = newStatus
      requestedReason = reason
      user.status = newStatus
      return user
    }

    const controller = new AdminUserController(context)
    await controller.decideStatus(target.user_key, 'rejected', '  CNPJ irregular.  ')

    assert.equal(requestedStatus, 'rejected')
    assert.equal(requestedReason, 'CNPJ irregular.')
    assert.equal(target.status, 'rejected')
    assert.equal(getCommitCount(), 1)
  })

  test('usuário inexistente gera 404 sem confirmar a transação', async () => {
    const { context, getCommitCount } = createControllerContext()
    UserRepository.prototype.getByKeyForUpdate = async () => null

    const controller = new AdminUserController(context)
    await assert.rejects(() => controller.decideStatus('missing-key', 'approved'), NotFoundUser)

    assert.equal(getCommitCount(), 0)
  })

  test('status final gera 409 sem atualizar ou confirmar', async () => {
    const target = { id: 17, user_key: 'final-user-key', profile: 'organizador', status: 'approved' }
    const { context, getCommitCount } = createControllerContext()
    let updateCalled = false

    UserRepository.prototype.getByKeyForUpdate = async () => target
    UserRepository.prototype.updateStatus = async () => {
      updateCalled = true
    }

    const controller = new AdminUserController(context)
    await assert.rejects(() => controller.decideStatus(target.user_key, 'rejected'), UserStatusConflict)

    assert.equal(updateCalled, false)
    assert.equal(getCommitCount(), 0)
  })

  test('cadastro pendente de admin não pode ser decidido pela rota', async () => {
    const target = { id: 18, user_key: 'pending-admin-key', profile: 'admin', status: 'pending' }
    const { context, getCommitCount } = createControllerContext()
    let updateCalled = false

    UserRepository.prototype.getByKeyForUpdate = async () => target
    UserRepository.prototype.updateStatus = async () => {
      updateCalled = true
    }

    const controller = new AdminUserController(context)
    await assert.rejects(() => controller.decideStatus(target.user_key, 'approved'), UserStatusConflict)

    assert.equal(updateCalled, false)
    assert.equal(getCommitCount(), 0)
  })

  test('admin não persistido ou não aprovado gera 403 sem confirmar', async () => {
    const target = { id: 19, user_key: 'organizer-key', profile: 'organizador', status: 'pending' }
    const { context, getCommitCount } = createControllerContext()
    UserRepository.prototype.getByKeyForUpdate = async () => target
    UserRepository.prototype.updateStatus = async () => null

    const controller = new AdminUserController(context)
    await assert.rejects(() => controller.decideStatus(target.user_key, 'approved'), ForbiddenProfile)

    assert.equal(getCommitCount(), 0)
  })

  test('erro ao gravar status ou histórico não confirma a transação', async () => {
    const target = { id: 20, user_key: 'organizer-key', profile: 'organizador', status: 'pending' }
    const { context, getCommitCount } = createControllerContext()
    UserRepository.prototype.getByKeyForUpdate = async () => target
    UserRepository.prototype.updateStatus = async () => {
      throw new Error('database write failed')
    }

    const controller = new AdminUserController(context)
    await assert.rejects(() => controller.decideStatus(target.user_key, 'approved'), /database write failed/)

    assert.equal(getCommitCount(), 0)
  })
})

describe('AdminUserController.getRegistrationList', () => {
  const originalGetRegistrationList = UserRepository.prototype.getRegistrationList

  afterEach(() => {
    UserRepository.prototype.getRegistrationList = originalGetRegistrationList
  })

  function createUser(index) {
    return {
      id: index,
      user_key: `user-key-${index}`,
      name: `Empresa ${index}`,
      profile: 'organizador',
      email: `empresa${index}@example.test`,
      password_hash: 'hash que não deve vazar',
      status: 'pending',
      created_at: new Date('2026-11-02T12:00:00.000Z'),
      organizer: { cnpj: '11222333000181', phone: '11999998888' },
      supplier: null,
    }
  }

  test('repassa limite, offset e status ao repository e devolve os DTOs', async () => {
    const { context } = createControllerContext()
    let repositoryArguments
    UserRepository.prototype.getRegistrationList = async (...args) => {
      repositoryArguments = args
      return [createUser(1)]
    }

    const controller = new AdminUserController(context)
    const result = await controller.getRegistrationList(10, 20, 'pending')

    assert.deepEqual(repositoryArguments, [10, 20, 'pending'])
    assert.equal(result.isLastPage, true)
    assert.equal(result.usersListDto.length, 1)
    assert.equal(result.usersListDto[0].user_key, 'user-key-1')
    assert.equal(Object.hasOwn(result.usersListDto[0], 'id'), false)
    assert.equal(Object.hasOwn(result.usersListDto[0], 'password_hash'), false)
  })

  test('aceita a listagem sem filtro de status', async () => {
    const { context } = createControllerContext()
    let requestedStatus = 'não chamado'
    UserRepository.prototype.getRegistrationList = async (limit, offset, status) => {
      requestedStatus = status
      return []
    }

    const controller = new AdminUserController(context)
    const result = await controller.getRegistrationList(10, 0, undefined)

    assert.equal(requestedStatus, undefined)
    assert.deepEqual(result, { usersListDto: [], isLastPage: true })
  })

  test('item a mais do repository indica próxima página e não vai na resposta', async () => {
    const { context } = createControllerContext()
    UserRepository.prototype.getRegistrationList = async () => [createUser(1), createUser(2), createUser(3)]

    const controller = new AdminUserController(context)
    const result = await controller.getRegistrationList(2, 0, undefined)

    assert.equal(result.isLastPage, false)
    assert.deepEqual(
      result.usersListDto.map((user) => user.user_key),
      ['user-key-1', 'user-key-2'],
    )
  })

  test('status inválido gera 400 sem consultar o banco', async () => {
    const { context } = createControllerContext()
    let repositoryCalled = false
    UserRepository.prototype.getRegistrationList = async () => {
      repositoryCalled = true
      return []
    }

    const controller = new AdminUserController(context)
    await assert.rejects(() => controller.getRegistrationList(10, 0, 'aprovado'), InvalidParameter)

    assert.equal(repositoryCalled, false)
  })
})
