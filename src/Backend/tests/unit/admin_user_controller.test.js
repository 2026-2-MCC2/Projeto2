// Testes unitários das regras da decisão administrativa de status de usuário.

import assert from 'node:assert/strict'
import { afterEach, describe, test } from 'node:test'

import { ForbiddenProfile, NotFoundUser, UserStatusConflict } from '../../src/errors/index.js'
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
    assert.deepEqual(updateArguments, [target, 'approved'])
    assert.deepEqual(operations, ['update', 'commit'])
    assert.equal(getCommitCount(), 1)
  })

  test('rejeita fornecedor pendente', async () => {
    const target = { id: 16, user_key: 'supplier-key', profile: 'fornecedor', status: 'pending' }
    const { context, getCommitCount } = createControllerContext()
    let requestedStatus

    UserRepository.prototype.getByKeyForUpdate = async () => target
    UserRepository.prototype.updateStatus = async (user, newStatus) => {
      requestedStatus = newStatus
      user.status = newStatus
      return user
    }

    const controller = new AdminUserController(context)
    await controller.decideStatus(target.user_key, 'rejected')

    assert.equal(requestedStatus, 'rejected')
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
