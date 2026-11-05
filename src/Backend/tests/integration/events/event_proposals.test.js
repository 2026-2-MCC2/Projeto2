// Testes de integração da consulta e comparação de propostas de um evento.

import assert from 'node:assert/strict'
import { afterEach, describe, test } from 'node:test'

import { DbUtils } from '../../utils/db_utils.js'
import { ObjectGenerator } from '../../utils/object_generator.js'
import { PayloadGenerator } from '../../utils/payload_generator.js'
import { RequestGenerator } from '../../utils/request_generator.js'
import { TokenGenerator } from '../../utils/token_generator.js'

const fixtureUserKeys = []

afterEach(async () => DbUtils.deleteUserFixtures(fixtureUserKeys.splice(0)))

async function createUserHeaders(profile) {
  const user = await ObjectGenerator.createUserFixture({ profile, status: 'approved' })
  fixtureUserKeys.push(user.userKey)
  return TokenGenerator.authorizationHeader(profile, { userKey: user.userKey })
}

async function createEvent(headers) {
  const [status, event] = await RequestGenerator.POST_events(PayloadGenerator.createEventPayload({ internal_costs: [] }), headers)
  assert.equal(status, 201)
  return event
}

describe('GET /events/:event_key/proposals', () => {
  test('organizador consulta as propostas agrupadas por item com validade e observações', async () => {
    const organizerHeaders = await createUserHeaders('organizador')
    const event = await createEvent(organizerHeaders)
    const item = await DbUtils.createBudgetItemFixture(event.event_key, { description: 'Sistema de som' })
    const firstSupplier = await ObjectGenerator.createUserFixture({
      profile: 'fornecedor',
      status: 'approved',
      name: 'Fornecedor A',
    })
    const secondSupplier = await ObjectGenerator.createUserFixture({
      profile: 'fornecedor',
      status: 'approved',
      name: 'Fornecedor B',
    })
    fixtureUserKeys.push(firstSupplier.userKey, secondSupplier.userKey)
    const currentProposal = await DbUtils.createProposalFixture(item.itemKey, firstSupplier.userKey, {
      amount: 1250,
      validUntil: '2099-01-01',
      notes: 'Inclui montagem e desmontagem.',
    })
    const expiredProposal = await DbUtils.createProposalFixture(item.itemKey, secondSupplier.userKey, {
      amount: 980,
      validUntil: '2000-01-01',
      notes: 'Validade encerrada.',
    })

    const { cnpj: firstSupplierCnpj } = await DbUtils.getSupplierByUserKey(firstSupplier.userKey)
    const { cnpj: secondSupplierCnpj } = await DbUtils.getSupplierByUserKey(secondSupplier.userKey)

    const [status, response] = await RequestGenerator.GET_event_proposals(event.event_key, organizerHeaders)

    assert.equal(status, 200)
    assert.equal(response.event_key, event.event_key)
    assert.equal(response.items[0].category, 'Alimentação')
    assert.equal(response.items[0].estimated_value, null)
    assert.equal(response.items.length, 1)
    assert.equal(response.items[0].item_key, item.itemKey)
    assert.equal(response.items[0].description, 'Sistema de som')
    assert.deepEqual(response.items[0].proposals, [
      {
        proposal_key: expiredProposal.proposalKey,
        supplier_name: 'Fornecedor B',
        supplier_cnpj: secondSupplierCnpj,
        amount: 980,
        valid_until: '2000-01-01',
        description: 'Descrição da proposta',
        not_included: null,
        delivery_terms: 'Entrega combinada',
        payment_terms: 'Pagamento combinado',
        team: null,
        warranty: null,
        notes: 'Validade encerrada.',
        status: 'sent',
        is_expired: true,
        // sem fotos enviadas (as fotos têm teste próprio em supplier_proposal_photos.test.js)
        photos: [],
      },
      {
        proposal_key: currentProposal.proposalKey,
        supplier_name: 'Fornecedor A',
        supplier_cnpj: firstSupplierCnpj,
        amount: 1250,
        valid_until: '2099-01-01',
        description: 'Descrição da proposta',
        not_included: null,
        delivery_terms: 'Entrega combinada',
        payment_terms: 'Pagamento combinado',
        team: null,
        warranty: null,
        notes: 'Inclui montagem e desmontagem.',
        status: 'sent',
        is_expired: false,
        photos: [],
      },
    ])
  })

  test('inclui item sem propostas com lista vazia', async () => {
    const organizerHeaders = await createUserHeaders('organizador')
    const event = await createEvent(organizerHeaders)
    const item = await DbUtils.createBudgetItemFixture(event.event_key)

    const [status, response] = await RequestGenerator.GET_event_proposals(event.event_key, organizerHeaders)

    assert.equal(status, 200)
    assert.deepEqual(response.items, [
      { item_key: item.itemKey, description: 'Item de teste', category: 'Alimentação', estimated_value: null, proposals: [] },
    ])
  })

  test('exige perfil organizador e oculta evento de outro organizador', async () => {
    const organizerHeaders = await createUserHeaders('organizador')
    const event = await createEvent(organizerHeaders)
    const supplierHeaders = await createUserHeaders('fornecedor')
    const otherOrganizerHeaders = await createUserHeaders('organizador')

    const [anonymousStatus] = await RequestGenerator.GET_event_proposals(event.event_key)
    const [supplierStatus] = await RequestGenerator.GET_event_proposals(event.event_key, supplierHeaders)
    const [otherOrganizerStatus, error] = await RequestGenerator.GET_event_proposals(event.event_key, otherOrganizerHeaders)

    assert.equal(anonymousStatus, 401)
    assert.equal(supplierStatus, 403)
    assert.equal(otherOrganizerStatus, 404)
    assert.equal(error.code, 'EVP000013')
  })
})
