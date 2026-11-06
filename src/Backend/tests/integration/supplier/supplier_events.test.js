import assert from 'node:assert/strict'
import { afterEach, describe, test } from 'node:test'

import { DbUtils } from '../../utils/db_utils.js'
import { ObjectGenerator } from '../../utils/object_generator.js'
import { PayloadGenerator } from '../../utils/payload_generator.js'
import { RequestGenerator } from '../../utils/request_generator.js'
import { TokenGenerator } from '../../utils/token_generator.js'

const fixtureUserKeys = []

afterEach(async () => DbUtils.deleteUserFixtures(fixtureUserKeys.splice(0)))

async function createUser(profile, status = 'approved') {
  const user = await ObjectGenerator.createUserFixture({ profile, status })
  fixtureUserKeys.push(user.userKey)
  return user
}

function authorizationFor(user) {
  return TokenGenerator.authorizationHeader(user.profile, { userKey: user.userKey })
}

async function createEventWithItems(organizerHeaders, { name, categories, publish = true, status } = {}) {
  const [eventStatus, event] = await RequestGenerator.POST_events(
    PayloadGenerator.createEventPayload({
      name,
      internal_costs: [{ type: 'tax', description: 'Custo confidencial', amount: 9999 }],
    }),
    organizerHeaders,
  )
  assert.equal(eventStatus, 201)

  const items = []
  for (const category of categories) {
    const [itemStatus, item] = await RequestGenerator.POST_event_item(
      event.event_key,
      PayloadGenerator.createBudgetItemPayload({ category, description: `${category} do evento` }),
      organizerHeaders,
    )
    assert.equal(itemStatus, 201)
    items.push(item)
  }

  if (publish || status) {
    const [publishStatus] = await RequestGenerator.PATCH_event_status(event.event_key, { status: 'open_for_quotes' }, organizerHeaders)
    assert.equal(publishStatus, 200)
  }
  if (status) {
    const [statusChange] = await RequestGenerator.PATCH_event_status(event.event_key, { status }, organizerHeaders)
    assert.equal(statusChange, 200)
  }

  return { event, items }
}

describe('GET /supplier/events', () => {
  test('evento de organizador bloqueado some da lista, do detalhe e não recebe proposta', async () => {
    const organizer = await createUser('organizador')
    const supplier = await createUser('fornecedor')
    const supplierHeaders = authorizationFor(supplier)
    const { event, items } = await createEventWithItems(authorizationFor(organizer), {
      name: 'Evento de organizador bloqueado',
      categories: ['Estrutura'],
    })

    await DbUtils.setUserStatus(organizer.userKey, 'blocked')

    const [listStatus, list] = await RequestGenerator.GET_supplier_events({}, supplierHeaders)
    const [detailStatus, detail] = await RequestGenerator.GET_supplier_event_by_key(event.event_key, supplierHeaders)
    const [proposalStatus, proposal] = await RequestGenerator.POST_supplier_item_proposal(
      event.event_key,
      items[0].item_key,
      PayloadGenerator.createSupplierProposalPayload({ valid_until: PayloadGenerator.dateFromToday(1) }),
      supplierHeaders,
    )

    assert.equal(listStatus, 200)
    assert.ok(!list.data.some((listed) => listed.event_key === event.event_key))
    assert.equal(detailStatus, 404)
    assert.equal(detail.code, 'EVP000013')
    assert.equal(proposalStatus, 404)
    assert.equal(proposal.code, 'EVP000013')
  })

  test('lista somente eventos em cotação que tenham itens nas categorias do fornecedor', async () => {
    const organizer = await createUser('organizador')
    const supplier = await createUser('fornecedor')
    const organizerHeaders = authorizationFor(organizer)
    const supplierHeaders = authorizationFor(supplier)

    const visible = await createEventWithItems(organizerHeaders, {
      name: 'Evento visível para Estrutura',
      categories: ['Estrutura'],
    })
    await createEventWithItems(organizerHeaders, {
      name: 'Evento em rascunho',
      categories: ['Estrutura'],
      publish: false,
    })
    await createEventWithItems(organizerHeaders, {
      name: 'Evento sem categoria compatível',
      categories: ['Alimentação'],
    })
    await createEventWithItems(organizerHeaders, {
      name: 'Evento encerrado',
      categories: ['Estrutura'],
      status: 'closed',
    })

    const [status, response] = await RequestGenerator.GET_supplier_events({}, supplierHeaders)

    assert.equal(status, 200)
    assert.equal(response.total, 1)
    assert.equal(response.data.length, 1)
    assert.equal(response.data[0].event_key, visible.event.event_key)
    assert.deepEqual(response.data[0].categories, ['Estrutura'])
    assert.equal(response.data[0].items_count, 1)
    assert.equal('profit_margin' in response.data[0], false)
    assert.equal('internal_costs' in response.data[0], false)
    assert.equal('total_internal_cost' in response.data[0], false)
    assert.equal('total_cost' in response.data[0], false)
  })

  test('aplica busca e paginação aos eventos visíveis', async () => {
    const organizer = await createUser('organizador')
    const supplier = await createUser('fornecedor')
    const organizerHeaders = authorizationFor(organizer)
    const supplierHeaders = authorizationFor(supplier)
    await createEventWithItems(organizerHeaders, { name: 'Evento Estrutura A', categories: ['Estrutura'] })
    await createEventWithItems(organizerHeaders, { name: 'Evento Estrutura B', categories: ['Estrutura'] })
    await createEventWithItems(organizerHeaders, { name: 'Evento Segurança', categories: ['Segurança'] })

    const [status, response] = await RequestGenerator.GET_supplier_events({ search: 'Estrutura', limit: 1, page: 0 }, supplierHeaders)

    assert.equal(status, 200)
    assert.equal(response.total, 2)
    assert.equal(response.data.length, 1)
    assert.equal(response.is_last_page, false)
    assert.match(response.data[0].name, /Estrutura/)
  })

  test('sem token responde 401 e outros perfis respondem 403', async () => {
    const organizer = await createUser('organizador')
    const supplier = await createUser('fornecedor', 'pending')

    const [anonymousStatus, anonymousError] = await RequestGenerator.GET_supplier_events()
    const [organizerStatus, organizerError] = await RequestGenerator.GET_supplier_events({}, authorizationFor(organizer))
    const [pendingStatus, pendingError] = await RequestGenerator.GET_supplier_events({}, authorizationFor(supplier))

    assert.equal(anonymousStatus, 401)
    assert.equal(anonymousError.code, 'APP000401')
    assert.equal(organizerStatus, 403)
    assert.equal(organizerError.code, 'APP000403')
    assert.equal(pendingStatus, 403)
    assert.equal(pendingError.code, 'APP000403')
  })
})

describe('GET /supplier/events/:event_key', () => {
  test('mostra somente itens das categorias do fornecedor sem revelar custos e propostas alheias', async () => {
    const organizer = await createUser('organizador')
    const supplier = await createUser('fornecedor')
    const otherSupplier = await createUser('fornecedor')
    const organizerHeaders = authorizationFor(organizer)
    const supplierHeaders = authorizationFor(supplier)
    const { event, items } = await createEventWithItems(organizerHeaders, {
      name: 'Evento com itens filtrados',
      categories: ['Estrutura', 'Alimentação'],
    })
    const ownProposal = await DbUtils.createProposalFixture(items[0].item_key, supplier.userKey, {
      status: 'sent',
      amount: 1500,
    })
    await DbUtils.createProposalFixture(items[0].item_key, otherSupplier.userKey, {
      status: 'accepted',
      amount: 900,
    })

    const [status, response] = await RequestGenerator.GET_supplier_event_by_key(event.event_key, supplierHeaders)

    assert.equal(status, 200)
    assert.equal(response.event_key, event.event_key)
    assert.equal(response.items.length, 1)
    assert.equal(response.items[0].category, 'Estrutura')
    assert.equal(response.items[0].item_key, items[0].item_key)
    const { valid_until: proposalValidUntil, ...myProposal } = response.items[0].my_proposal
    assert.deepEqual(myProposal, {
      proposal_key: ownProposal.proposalKey,
      status: 'sent',
      amount: 1500,
    })
    assert.match(proposalValidUntil, /^\d{4}-\d{2}-\d{2}$/)
    assert.equal('profit_margin' in response, false)
    assert.equal('internal_costs' in response, false)
    assert.equal('total_internal_cost' in response, false)
    assert.equal('total_cost' in response, false)
    assert.equal('accepted_proposal' in response.items[0], false)
    assert.equal('proposals_count' in response.items[0], false)
  })

  test('evento inexistente, fora de cotação ou sem categoria compatível responde 404', async () => {
    const organizer = await createUser('organizador')
    const supplier = await createUser('fornecedor')
    const organizerHeaders = authorizationFor(organizer)
    const supplierHeaders = authorizationFor(supplier)
    const draft = await createEventWithItems(organizerHeaders, {
      name: 'Evento em rascunho',
      categories: ['Estrutura'],
      publish: false,
    })
    const incompatible = await createEventWithItems(organizerHeaders, {
      name: 'Evento de outra categoria',
      categories: ['Alimentação'],
    })

    const [draftStatus] = await RequestGenerator.GET_supplier_event_by_key(draft.event.event_key, supplierHeaders)
    const [incompatibleStatus] = await RequestGenerator.GET_supplier_event_by_key(incompatible.event.event_key, supplierHeaders)
    const [missingStatus] = await RequestGenerator.GET_supplier_event_by_key('00000000-0000-4000-8000-000000000001', supplierHeaders)

    assert.equal(draftStatus, 404)
    assert.equal(incompatibleStatus, 404)
    assert.equal(missingStatus, 404)
  })
})
