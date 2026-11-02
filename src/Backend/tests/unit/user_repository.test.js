// Testes unitários do repository administrativo sem abrir conexão com o banco.

import assert from 'node:assert/strict'
import { afterEach, describe, test } from 'node:test'

import { User, UserStatusEvent } from '../../src/models/index.js'
import { UserRepository } from '../../src/repositories/user_repository.js'

const originalFindOne = User.findOne
const originalCreateStatusEvent = UserStatusEvent.create

afterEach(() => {
  User.findOne = originalFindOne
  UserStatusEvent.create = originalCreateStatusEvent
})

function createContext() {
  const session = { LOCK: { UPDATE: Symbol('UPDATE') } }
  return {
    dbSession: session,
    user: { userKey: 'admin-user-key' },
  }
}

describe('UserRepository', () => {
  test('busca o usuário pela chave e bloqueia a linha para atualização', async () => {
    const context = createContext()
    const targetUser = { id: 15, status: 'pending' }
    let queryOptions
    User.findOne = async (options) => {
      queryOptions = options
      return targetUser
    }

    const repository = new UserRepository(context)
    const result = await repository.getByKeyForUpdate('target-user-key')

    assert.equal(result, targetUser)
    assert.deepEqual(queryOptions.where, { user_key: 'target-user-key' })
    assert.equal(queryOptions.lock, context.dbSession.LOCK.UPDATE)
    assert.equal(queryOptions.transaction, context.dbSession)
  })

  test('aprova e registra usuário e administrador na mesma transação', async () => {
    const context = createContext()
    const administrator = { id: 3 }
    const targetUser = {
      id: 15,
      status: 'pending',
      approved_at: null,
      async save(options) {
        this.saveOptions = options
      },
    }
    let adminQuery
    let eventValues
    let eventOptions

    User.findOne = async (options) => {
      adminQuery = options
      return administrator
    }
    UserStatusEvent.create = async (values, options) => {
      eventValues = values
      eventOptions = options
    }

    const repository = new UserRepository(context)
    const result = await repository.updateStatus(targetUser, 'approved')

    assert.equal(result, targetUser)
    assert.equal(targetUser.status, 'approved')
    assert.ok(targetUser.approved_at instanceof Date)
    assert.equal(targetUser.saveOptions.transaction, context.dbSession)
    assert.deepEqual(adminQuery.where, {
      user_key: context.user.userKey,
      profile: 'admin',
      status: 'approved',
    })
    assert.equal(adminQuery.transaction, context.dbSession)
    assert.deepEqual(eventValues, {
      user_id: targetUser.id,
      admin_user_id: administrator.id,
      old_status: 'pending',
      new_status: 'approved',
      event_datetime: eventValues.event_datetime,
    })
    assert.ok(eventValues.event_datetime instanceof Date)
    assert.equal(eventOptions.transaction, context.dbSession)
  })

  test('rejeita deixando approved_at nulo e registra o status anterior', async () => {
    const context = createContext()
    const administrator = { id: 3 }
    const targetUser = {
      id: 15,
      status: 'pending',
      approved_at: null,
      async save() {},
    }
    let eventValues

    User.findOne = async () => administrator
    UserStatusEvent.create = async (values) => {
      eventValues = values
    }

    const repository = new UserRepository(context)
    await repository.updateStatus(targetUser, 'rejected')

    assert.equal(targetUser.status, 'rejected')
    assert.equal(targetUser.approved_at, null)
    assert.equal(eventValues.old_status, 'pending')
    assert.equal(eventValues.new_status, 'rejected')
    assert.equal(eventValues.user_id, targetUser.id)
    assert.equal(eventValues.admin_user_id, administrator.id)
  })

  test('não altera o usuário se não encontrar administrador aprovado persistido', async () => {
    const targetUser = {
      id: 15,
      status: 'pending',
      approved_at: null,
      async save() {
        assert.fail('não deve salvar sem administrador persistido')
      },
    }
    User.findOne = async () => null
    UserStatusEvent.create = async () => assert.fail('não deve gravar histórico sem administrador')

    const repository = new UserRepository(createContext())
    const result = await repository.updateStatus(targetUser, 'approved')

    assert.equal(result, null)
    assert.equal(targetUser.status, 'pending')
    assert.equal(targetUser.approved_at, null)
  })
})
