import assert from 'node:assert/strict'
import { afterEach, describe, test } from 'node:test'

import { UniqueConstraintError } from 'sequelize'

import { SupplierEventController } from '../../src/controllers/supplier_event_controller.js'
import {
  ForbiddenProfile,
  InvalidParameter,
  NotFoundBudgetItem,
  NotFoundEvent,
  ProposalAlreadySent,
  ProposalValidUntilAfterEvent,
  ProposalValidUntilInPast,
} from '../../src/errors/index.js'
import { ProposalRepository } from '../../src/repositories/proposal_repository.js'
import { SupplierEventRepository } from '../../src/repositories/supplier_event_repository.js'
import { UserRepository } from '../../src/repositories/user_repository.js'

const EVENT_KEY = '11111111-1111-4111-8111-111111111111'
const ITEM_KEY = '22222222-2222-4222-8222-222222222222'

const originals = {
  getProfileByKey: UserRepository.prototype.getProfileByKey,
  getAvailableEvent: SupplierEventRepository.prototype.getAvailableEvent,
  getAvailableItem: SupplierEventRepository.prototype.getAvailableItem,
  getBySupplierAndItem: ProposalRepository.prototype.getBySupplierAndItem,
  create: ProposalRepository.prototype.create,
}

afterEach(() => {
  UserRepository.prototype.getProfileByKey = originals.getProfileByKey
  SupplierEventRepository.prototype.getAvailableEvent = originals.getAvailableEvent
  SupplierEventRepository.prototype.getAvailableItem = originals.getAvailableItem
  ProposalRepository.prototype.getBySupplierAndItem = originals.getBySupplierAndItem
  ProposalRepository.prototype.create = originals.create
})

function daysFromToday(days) {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function createPayload(overrides = {}) {
  return {
    amount: 1500.5,
    description: '  Palco 10x8 com cobertura  ',
    delivery_terms: 'Montagem na véspera',
    payment_terms: '50% na assinatura',
    valid_until: daysFromToday(5),
    not_included: '   ',
    team: 'Equipe de 4 montadores',
    ...overrides,
  }
}

function createContext() {
  const operations = []
  return {
    operations,
    context: {
      dbSession: {
        async commit() {
          operations.push('commit')
        },
      },
    },
  }
}

// fornecedor 8 atende o item 30 do evento 20, que termina daqui a 10 dias e ainda não tem proposta dele
function mockAvailableItem(operations) {
  const calls = {}
  UserRepository.prototype.getProfileByKey = async () => ({ id: 1, supplier: { id: 8 } })
  SupplierEventRepository.prototype.getAvailableEvent = async (supplierId, eventKey, options) => {
    calls.event = { supplierId, eventKey, options }
    return { id: 20, event_key: EVENT_KEY, end_date: new Date(`${daysFromToday(10)}T22:00:00.000Z`) }
  }
  SupplierEventRepository.prototype.getAvailableItem = async (eventId, supplierId, itemKey) => {
    calls.item = { eventId, supplierId, itemKey }
    return { id: 30, item_key: itemKey }
  }
  ProposalRepository.prototype.getBySupplierAndItem = async () => null
  ProposalRepository.prototype.create = async (supplierId, budgetItemId, fields) => {
    calls.create = { supplierId, budgetItemId, fields }
    operations.push('create')
    return { id: 99, proposal_key: 'nova-proposta', status: 'sent', selected: false, ...fields }
  }
  return calls
}

describe('SupplierEventController.createProposal', () => {
  test('grava a proposta enviada no item do evento travado e confirma só no final', async () => {
    const { context, operations } = createContext()
    const calls = mockAvailableItem(operations)

    const controller = new SupplierEventController(context)
    const result = await controller.createProposal('supplier-key', EVENT_KEY, ITEM_KEY, createPayload())

    assert.deepEqual(result, { proposal_key: 'nova-proposta', status: 'sent' })
    assert.deepEqual(calls.event, { supplierId: 8, eventKey: EVENT_KEY, options: { lock: true } })
    assert.deepEqual(calls.item, { eventId: 20, supplierId: 8, itemKey: ITEM_KEY })
    assert.equal(calls.create.supplierId, 8)
    assert.equal(calls.create.budgetItemId, 30)
    assert.deepEqual(calls.create.fields, {
      amount: 1500.5,
      description: 'Palco 10x8 com cobertura',
      not_included: null,
      delivery_terms: 'Montagem na véspera',
      payment_terms: '50% na assinatura',
      team: 'Equipe de 4 montadores',
      warranty: null,
      valid_until: daysFromToday(5),
      notes: null,
    })
    assert.deepEqual(operations, ['create', 'commit'])
  })

  test('aceita validade hoje e no dia do fim do evento', async () => {
    const { context, operations } = createContext()
    mockAvailableItem(operations)

    const controller = new SupplierEventController(context)
    await controller.createProposal('supplier-key', EVENT_KEY, ITEM_KEY, createPayload({ valid_until: daysFromToday(0) }))
    await controller.createProposal('supplier-key', EVENT_KEY, ITEM_KEY, createPayload({ valid_until: daysFromToday(10) }))

    assert.deepEqual(operations, ['create', 'commit', 'create', 'commit'])
  })

  test('evento fora de cotação ou sem categoria do fornecedor responde 404 de evento', async () => {
    const { context, operations } = createContext()
    mockAvailableItem(operations)
    SupplierEventRepository.prototype.getAvailableEvent = async () => null

    const controller = new SupplierEventController(context)
    await assert.rejects(() => controller.createProposal('supplier-key', EVENT_KEY, ITEM_KEY, createPayload()), NotFoundEvent)

    assert.deepEqual(operations, [])
  })

  test('item de outro evento ou de outra categoria responde 404 de item', async () => {
    const { context, operations } = createContext()
    mockAvailableItem(operations)
    SupplierEventRepository.prototype.getAvailableItem = async () => null

    const controller = new SupplierEventController(context)
    await assert.rejects(() => controller.createProposal('supplier-key', EVENT_KEY, ITEM_KEY, createPayload()), NotFoundBudgetItem)

    assert.deepEqual(operations, [])
  })

  test('validade antes de hoje responde 400 sem gravar', async () => {
    const { context, operations } = createContext()
    mockAvailableItem(operations)

    const controller = new SupplierEventController(context)
    await assert.rejects(
      () => controller.createProposal('supplier-key', EVENT_KEY, ITEM_KEY, createPayload({ valid_until: daysFromToday(-1) })),
      ProposalValidUntilInPast,
    )

    assert.deepEqual(operations, [])
  })

  test('validade depois do fim do evento responde 400 sem gravar', async () => {
    const { context, operations } = createContext()
    mockAvailableItem(operations)

    const controller = new SupplierEventController(context)
    await assert.rejects(
      () => controller.createProposal('supplier-key', EVENT_KEY, ITEM_KEY, createPayload({ valid_until: daysFromToday(11) })),
      ProposalValidUntilAfterEvent,
    )

    assert.deepEqual(operations, [])
  })

  test('data que não existe no calendário responde 400', async () => {
    const { context, operations } = createContext()
    mockAvailableItem(operations)

    const controller = new SupplierEventController(context)
    await assert.rejects(
      () => controller.createProposal('supplier-key', EVENT_KEY, ITEM_KEY, createPayload({ valid_until: '2027-02-31' })),
      InvalidParameter,
    )

    assert.deepEqual(operations, [])
  })

  test('proposta já enviada pelo fornecedor responde 409', async () => {
    const { context, operations } = createContext()
    mockAvailableItem(operations)
    ProposalRepository.prototype.getBySupplierAndItem = async () => ({ id: 77 })

    const controller = new SupplierEventController(context)
    await assert.rejects(() => controller.createProposal('supplier-key', EVENT_KEY, ITEM_KEY, createPayload()), ProposalAlreadySent)

    assert.deepEqual(operations, [])
  })

  test('UNIQUE de item e fornecedor no banco (corrida) vira o mesmo 409 sem confirmar', async () => {
    const { context, operations } = createContext()
    mockAvailableItem(operations)
    ProposalRepository.prototype.create = async () => {
      throw new UniqueConstraintError({ fields: { budget_item_id: '30-8' } })
    }

    const controller = new SupplierEventController(context)
    await assert.rejects(() => controller.createProposal('supplier-key', EVENT_KEY, ITEM_KEY, createPayload()), ProposalAlreadySent)

    assert.deepEqual(operations, [])
  })

  test('outro erro do banco é repassado sem confirmar', async () => {
    const { context, operations } = createContext()
    mockAvailableItem(operations)
    ProposalRepository.prototype.create = async () => {
      throw new Error('database write failed')
    }

    const controller = new SupplierEventController(context)
    await assert.rejects(() => controller.createProposal('supplier-key', EVENT_KEY, ITEM_KEY, createPayload()), /database write failed/)

    assert.deepEqual(operations, [])
  })

  test('usuário sem dados de fornecedor responde 403', async () => {
    const { context, operations } = createContext()
    mockAvailableItem(operations)
    UserRepository.prototype.getProfileByKey = async () => ({ id: 1, supplier: null })

    const controller = new SupplierEventController(context)
    await assert.rejects(() => controller.createProposal('organizer-key', EVENT_KEY, ITEM_KEY, createPayload()), ForbiddenProfile)

    assert.deepEqual(operations, [])
  })
})
