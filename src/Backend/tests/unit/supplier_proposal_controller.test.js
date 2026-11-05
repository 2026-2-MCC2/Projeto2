import assert from 'node:assert/strict'
import { afterEach, describe, test } from 'node:test'

import { UniqueConstraintError } from 'sequelize'

import { StorageConnector } from '../../src/connectors/storage/index.js'

import { SupplierProposalController } from '../../src/controllers/supplier_proposal_controller.js'
import {
  ForbiddenProfile,
  InvalidParameter,
  NotFoundBudgetItem,
  NotFoundEvent,
  NotFoundProposal,
  ProposalAlreadySent,
  ProposalCannotBeChanged,
  ProposalEventNotOpen,
  ProposalValidUntilAfterEvent,
  ProposalValidUntilInPast,
} from '../../src/errors/index.js'
import { ProposalRepository } from '../../src/repositories/proposal_repository.js'
import { SupplierEventRepository } from '../../src/repositories/supplier_event_repository.js'
import { UserRepository } from '../../src/repositories/user_repository.js'

const EVENT_KEY = '11111111-1111-4111-8111-111111111111'
const ITEM_KEY = '22222222-2222-4222-8222-222222222222'

const originals = {
  getUrl: StorageConnector.getUrl,
  getProfileByKey: UserRepository.prototype.getProfileByKey,
  getAvailableEvent: SupplierEventRepository.prototype.getAvailableEvent,
  getAvailableItem: SupplierEventRepository.prototype.getAvailableItem,
  getBySupplierAndItem: ProposalRepository.prototype.getBySupplierAndItem,
  hasAcceptedProposal: ProposalRepository.prototype.hasAcceptedProposal,
  create: ProposalRepository.prototype.create,
  getEventForShare: SupplierEventRepository.prototype.getEventForShare,
  getSupplierProposals: ProposalRepository.prototype.getSupplierProposals,
  getSupplierProposalByKey: ProposalRepository.prototype.getSupplierProposalByKey,
  getPhotos: ProposalRepository.prototype.getPhotos,
  getSupplierProposalForUpdate: ProposalRepository.prototype.getSupplierProposalForUpdate,
  update: ProposalRepository.prototype.update,
  delete: ProposalRepository.prototype.delete,
}

afterEach(() => {
  StorageConnector.getUrl = originals.getUrl
  UserRepository.prototype.getProfileByKey = originals.getProfileByKey
  SupplierEventRepository.prototype.getAvailableEvent = originals.getAvailableEvent
  SupplierEventRepository.prototype.getAvailableItem = originals.getAvailableItem
  ProposalRepository.prototype.getBySupplierAndItem = originals.getBySupplierAndItem
  ProposalRepository.prototype.hasAcceptedProposal = originals.hasAcceptedProposal
  ProposalRepository.prototype.create = originals.create
  SupplierEventRepository.prototype.getEventForShare = originals.getEventForShare
  ProposalRepository.prototype.getSupplierProposals = originals.getSupplierProposals
  ProposalRepository.prototype.getSupplierProposalByKey = originals.getSupplierProposalByKey
  ProposalRepository.prototype.getPhotos = originals.getPhotos
  ProposalRepository.prototype.getSupplierProposalForUpdate = originals.getSupplierProposalForUpdate
  ProposalRepository.prototype.update = originals.update
  ProposalRepository.prototype.delete = originals.delete
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
  ProposalRepository.prototype.hasAcceptedProposal = async () => false
  ProposalRepository.prototype.create = async (supplierId, budgetItemId, fields) => {
    calls.create = { supplierId, budgetItemId, fields }
    operations.push('create')
    return { id: 99, proposal_key: 'nova-proposta', status: 'sent', selected: false, ...fields }
  }
  return calls
}

describe('SupplierProposalController.createProposal', () => {
  test('grava a proposta enviada no item do evento travado e confirma só no final', async () => {
    const { context, operations } = createContext()
    const calls = mockAvailableItem(operations)

    const controller = new SupplierProposalController(context)
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

    const controller = new SupplierProposalController(context)
    await controller.createProposal('supplier-key', EVENT_KEY, ITEM_KEY, createPayload({ valid_until: daysFromToday(0) }))
    await controller.createProposal('supplier-key', EVENT_KEY, ITEM_KEY, createPayload({ valid_until: daysFromToday(10) }))

    assert.deepEqual(operations, ['create', 'commit', 'create', 'commit'])
  })

  test('evento fora de cotação ou sem categoria do fornecedor responde 404 de evento', async () => {
    const { context, operations } = createContext()
    mockAvailableItem(operations)
    SupplierEventRepository.prototype.getAvailableEvent = async () => null

    const controller = new SupplierProposalController(context)
    await assert.rejects(() => controller.createProposal('supplier-key', EVENT_KEY, ITEM_KEY, createPayload()), NotFoundEvent)

    assert.deepEqual(operations, [])
  })

  test('item de outro evento ou de outra categoria responde 404 de item', async () => {
    const { context, operations } = createContext()
    mockAvailableItem(operations)
    SupplierEventRepository.prototype.getAvailableItem = async () => null

    const controller = new SupplierProposalController(context)
    await assert.rejects(() => controller.createProposal('supplier-key', EVENT_KEY, ITEM_KEY, createPayload()), NotFoundBudgetItem)

    assert.deepEqual(operations, [])
  })

  test('validade antes de hoje responde 400 sem gravar', async () => {
    const { context, operations } = createContext()
    mockAvailableItem(operations)

    const controller = new SupplierProposalController(context)
    await assert.rejects(
      () => controller.createProposal('supplier-key', EVENT_KEY, ITEM_KEY, createPayload({ valid_until: daysFromToday(-1) })),
      ProposalValidUntilInPast,
    )

    assert.deepEqual(operations, [])
  })

  test('validade depois do fim do evento responde 400 sem gravar', async () => {
    const { context, operations } = createContext()
    mockAvailableItem(operations)

    const controller = new SupplierProposalController(context)
    await assert.rejects(
      () => controller.createProposal('supplier-key', EVENT_KEY, ITEM_KEY, createPayload({ valid_until: daysFromToday(11) })),
      ProposalValidUntilAfterEvent,
    )

    assert.deepEqual(operations, [])
  })

  test('data que não existe no calendário responde 400', async () => {
    const { context, operations } = createContext()
    mockAvailableItem(operations)

    const controller = new SupplierProposalController(context)
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

    const controller = new SupplierProposalController(context)
    await assert.rejects(() => controller.createProposal('supplier-key', EVENT_KEY, ITEM_KEY, createPayload()), ProposalAlreadySent)

    assert.deepEqual(operations, [])
  })

  test('UNIQUE de item e fornecedor no banco (corrida) vira o mesmo 409 sem confirmar', async () => {
    const { context, operations } = createContext()
    mockAvailableItem(operations)
    ProposalRepository.prototype.create = async () => {
      throw new UniqueConstraintError({ fields: { budget_item_id: '30-8' } })
    }

    const controller = new SupplierProposalController(context)
    await assert.rejects(() => controller.createProposal('supplier-key', EVENT_KEY, ITEM_KEY, createPayload()), ProposalAlreadySent)

    assert.deepEqual(operations, [])
  })

  test('outro erro do banco é repassado sem confirmar', async () => {
    const { context, operations } = createContext()
    mockAvailableItem(operations)
    ProposalRepository.prototype.create = async () => {
      throw new Error('database write failed')
    }

    const controller = new SupplierProposalController(context)
    await assert.rejects(() => controller.createProposal('supplier-key', EVENT_KEY, ITEM_KEY, createPayload()), /database write failed/)

    assert.deepEqual(operations, [])
  })

  test('usuário sem dados de fornecedor responde 403', async () => {
    const { context, operations } = createContext()
    mockAvailableItem(operations)
    UserRepository.prototype.getProfileByKey = async () => ({ id: 1, supplier: null })

    const controller = new SupplierProposalController(context)
    await assert.rejects(() => controller.createProposal('organizer-key', EVENT_KEY, ITEM_KEY, createPayload()), ForbiddenProfile)

    assert.deepEqual(operations, [])
  })
})

const PROPOSAL_KEY = '33333333-3333-4333-8333-333333333333'
const PHOTO_KEY = '44444444-4444-4444-8444-444444444444'
const PHOTO_PATH = `proposals/${PROPOSAL_KEY}/${PHOTO_KEY}.jpg`

// linha do ProposalRepository.getSupplierProposalByKey: proposta 99 do fornecedor 8, evento 20
function proposalRow(overrides = {}) {
  return {
    id: 99,
    proposal_key: PROPOSAL_KEY,
    amount: '1500.00',
    valid_until: daysFromToday(5),
    status: 'sent',
    selected: 0,
    sent_at: new Date('2026-11-04T12:00:00.000Z'),
    event_id: 20,
    event_key: EVENT_KEY,
    event_name: 'Festival',
    event_status: 'open_for_quotes',
    event_end_date: new Date(`${daysFromToday(10)}T22:00:00.000Z`),
    item_key: ITEM_KEY,
    item_description: 'Palco',
    item_category: 'Estrutura',
    item_type: 'service',
    item_quantity: 1,
    description: 'Palco 10x8',
    not_included: null,
    delivery_terms: 'Na véspera',
    payment_terms: 'À vista',
    team: null,
    warranty: null,
    notes: null,
    ...overrides,
  }
}

// proposta do fornecedor que pode ser alterada: enviada, num evento em cotação
function mockChangeableProposal(operations, { status = 'sent', eventStatus = 'open_for_quotes' } = {}) {
  const calls = {}
  UserRepository.prototype.getProfileByKey = async () => ({ id: 1, supplier: { id: 8 } })
  ProposalRepository.prototype.getSupplierProposalByKey = async (supplierId, proposalKey) => {
    calls.lookup = { supplierId, proposalKey }
    return proposalRow({ status, event_status: eventStatus, ...calls.updatedFields })
  }
  ProposalRepository.prototype.getPhotos = async () => [{ position: 1, url: PHOTO_PATH }]
  // URL de leitura simulada: o teste não fala com o armazenamento
  StorageConnector.getUrl = async (path) => `https://armazenamento.test/${path}?assinatura=teste`
  SupplierEventRepository.prototype.getEventForShare = async (eventId) => {
    operations.push(`lockEvent:${eventId}`)
    return { id: eventId, status: eventStatus, end_date: new Date(`${daysFromToday(10)}T22:00:00.000Z`) }
  }
  ProposalRepository.prototype.getSupplierProposalForUpdate = async (supplierId, proposalKey) => {
    operations.push('lockProposal')
    return { id: 99, proposal_key: proposalKey, supplier_id: supplierId, status }
  }
  ProposalRepository.prototype.update = async (proposal, fields) => {
    calls.updatedFields = fields
    operations.push('update')
  }
  ProposalRepository.prototype.delete = async () => {
    operations.push('delete')
  }
  return calls
}

describe('SupplierProposalController.getProposals', () => {
  test('pagina o histórico do fornecedor logado e repassa o filtro de status', async () => {
    const { context } = createContext()
    let repositoryArguments
    UserRepository.prototype.getProfileByKey = async () => ({ id: 1, supplier: { id: 8 } })
    ProposalRepository.prototype.getSupplierProposals = async (...args) => {
      repositoryArguments = args
      return { proposals: [proposalRow()], total: 3 }
    }

    const controller = new SupplierProposalController(context)
    const result = await controller.getProposals('supplier-key', { status: 'sent', limit: 1, page: 1 })

    assert.deepEqual(repositoryArguments, [8, { status: 'sent', limit: 1, offset: 1 }])
    assert.equal(result.total, 3)
    assert.equal(result.is_last_page, false)
    assert.deepEqual(result.data[0], {
      proposal_key: PROPOSAL_KEY,
      event: { event_key: EVENT_KEY, name: 'Festival', status: 'open_for_quotes' },
      item: { item_key: ITEM_KEY, description: 'Palco', category: 'Estrutura' },
      amount: 1500,
      valid_until: daysFromToday(5),
      status: 'sent',
      selected: false,
      sent_at: '2026-11-04T12:00:00.000Z',
    })
  })

  test('status que não existe responde 400 sem consultar o banco', async () => {
    const { context } = createContext()
    let consulted = false
    ProposalRepository.prototype.getSupplierProposals = async () => {
      consulted = true
    }

    const controller = new SupplierProposalController(context)
    await assert.rejects(() => controller.getProposals('supplier-key', { status: 'canceled', limit: 20, page: 0 }), InvalidParameter)

    assert.equal(consulted, false)
  })
})

describe('SupplierProposalController.getProposal', () => {
  test('devolve o detalhe completo com as fotos, sem ids internos', async () => {
    const { context, operations } = createContext()
    const calls = mockChangeableProposal(operations)

    const controller = new SupplierProposalController(context)
    const result = await controller.getProposal('supplier-key', PROPOSAL_KEY)

    assert.deepEqual(calls.lookup, { supplierId: 8, proposalKey: PROPOSAL_KEY })
    assert.equal(result.proposal_key, PROPOSAL_KEY)
    assert.equal(result.delivery_terms, 'Na véspera')
    assert.equal(result.event.end_date, `${daysFromToday(10)}T22:00:00.000Z`)
    assert.deepEqual(result.item, { item_key: ITEM_KEY, description: 'Palco', category: 'Estrutura', type: 'service', quantity: 1 })
    assert.deepEqual(result.photos, [{ photo_key: PHOTO_KEY, url: `https://armazenamento.test/${PHOTO_PATH}?assinatura=teste` }])
    assert.equal('id' in result, false)
    assert.equal('event_id' in result, false)
  })

  test('proposta de outro fornecedor responde 404', async () => {
    const { context, operations } = createContext()
    mockChangeableProposal(operations)
    ProposalRepository.prototype.getSupplierProposalByKey = async () => null

    const controller = new SupplierProposalController(context)
    await assert.rejects(() => controller.getProposal('supplier-key', PROPOSAL_KEY), NotFoundProposal)
  })
})

describe('SupplierProposalController.updateProposal', () => {
  test('trava o evento e depois a proposta, grava os campos e confirma no final', async () => {
    const { context, operations } = createContext()
    const calls = mockChangeableProposal(operations)

    const controller = new SupplierProposalController(context)
    const result = await controller.updateProposal('supplier-key', PROPOSAL_KEY, createPayload({ amount: 1999 }))

    assert.deepEqual(operations, ['lockEvent:20', 'lockProposal', 'update', 'commit'])
    assert.equal(calls.updatedFields.amount, 1999)
    assert.equal(calls.updatedFields.description, 'Palco 10x8 com cobertura')
    assert.equal(calls.updatedFields.not_included, null)
    assert.equal(result.amount, 1999)
  })

  test('proposta aceita, rejeitada ou em análise responde 409 sem gravar', async () => {
    for (const status of ['accepted', 'rejected', 'under_review']) {
      const { context, operations } = createContext()
      mockChangeableProposal(operations, { status })

      const controller = new SupplierProposalController(context)
      await assert.rejects(() => controller.updateProposal('supplier-key', PROPOSAL_KEY, createPayload()), ProposalCannotBeChanged)

      assert.deepEqual(operations, ['lockEvent:20', 'lockProposal'], status)
    }
  })

  test('evento fora de cotação responde 409 sem gravar', async () => {
    const { context, operations } = createContext()
    mockChangeableProposal(operations, { eventStatus: 'closed' })

    const controller = new SupplierProposalController(context)
    await assert.rejects(() => controller.updateProposal('supplier-key', PROPOSAL_KEY, createPayload()), ProposalEventNotOpen)

    assert.deepEqual(operations, ['lockEvent:20', 'lockProposal'])
  })

  test('validade antes de hoje ou depois do evento responde 400 sem gravar', async () => {
    const { context, operations } = createContext()
    mockChangeableProposal(operations)

    const controller = new SupplierProposalController(context)
    await assert.rejects(
      () => controller.updateProposal('supplier-key', PROPOSAL_KEY, createPayload({ valid_until: daysFromToday(-1) })),
      ProposalValidUntilInPast,
    )
    await assert.rejects(
      () => controller.updateProposal('supplier-key', PROPOSAL_KEY, createPayload({ valid_until: daysFromToday(11) })),
      ProposalValidUntilAfterEvent,
    )

    assert.equal(operations.includes('update'), false)
    assert.equal(operations.includes('commit'), false)
  })

  test('proposta de outro fornecedor ou apagada no meio responde 404', async () => {
    const { context, operations } = createContext()
    mockChangeableProposal(operations)
    ProposalRepository.prototype.getSupplierProposalByKey = async () => null

    const controller = new SupplierProposalController(context)
    await assert.rejects(() => controller.updateProposal('supplier-key', PROPOSAL_KEY, createPayload()), NotFoundProposal)

    mockChangeableProposal(operations)
    ProposalRepository.prototype.getSupplierProposalForUpdate = async () => null
    await assert.rejects(() => controller.updateProposal('supplier-key', PROPOSAL_KEY, createPayload()), NotFoundProposal)
    assert.equal(operations.includes('update'), false)
  })
})

describe('SupplierProposalController.deleteProposal', () => {
  test('apaga a proposta enviada de evento em cotação e confirma no final', async () => {
    const { context, operations } = createContext()
    mockChangeableProposal(operations)

    const controller = new SupplierProposalController(context)
    await controller.deleteProposal('supplier-key', PROPOSAL_KEY)

    assert.deepEqual(operations, ['lockEvent:20', 'lockProposal', 'delete', 'commit'])
  })

  test('proposta aceita ou rejeitada responde 409 sem apagar', async () => {
    for (const status of ['accepted', 'rejected']) {
      const { context, operations } = createContext()
      mockChangeableProposal(operations, { status })

      const controller = new SupplierProposalController(context)
      await assert.rejects(() => controller.deleteProposal('supplier-key', PROPOSAL_KEY), ProposalCannotBeChanged)

      assert.equal(operations.includes('delete'), false, status)
    }
  })

  test('evento fora de cotação responde 409 sem apagar', async () => {
    const { context, operations } = createContext()
    mockChangeableProposal(operations, { eventStatus: 'canceled' })

    const controller = new SupplierProposalController(context)
    await assert.rejects(() => controller.deleteProposal('supplier-key', PROPOSAL_KEY), ProposalEventNotOpen)

    assert.equal(operations.includes('delete'), false)
  })

  test('proposta de outro fornecedor responde 404 sem apagar', async () => {
    const { context, operations } = createContext()
    mockChangeableProposal(operations)
    ProposalRepository.prototype.getSupplierProposalByKey = async () => null

    const controller = new SupplierProposalController(context)
    await assert.rejects(() => controller.deleteProposal('supplier-key', PROPOSAL_KEY), NotFoundProposal)

    assert.deepEqual(operations, [])
  })
})
