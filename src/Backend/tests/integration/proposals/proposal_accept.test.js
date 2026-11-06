import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { afterEach, describe, test } from 'node:test'

import { DbUtils } from '../../utils/db_utils.js'
import { ObjectGenerator } from '../../utils/object_generator.js'
import { PayloadGenerator } from '../../utils/payload_generator.js'
import { RequestGenerator } from '../../utils/request_generator.js'
import { TokenGenerator } from '../../utils/token_generator.js'
import { Mailpit } from '../../utils/mailpit.js'

const fixtureUserKeys = []

afterEach(async () => DbUtils.deleteUserFixtures(fixtureUserKeys.splice(0)))

async function createUser(profile, name = 'RF12 Test User') {
  const user = await ObjectGenerator.createUserFixture({ profile, status: 'approved', name })
  fixtureUserKeys.push(user.userKey)
  return {
    user,
    headers: TokenGenerator.authorizationHeader(profile, { userKey: user.userKey }),
  }
}

async function createEvent(organizerHeaders, { publish = true, internalCost = 500 } = {}) {
  const [createStatus, event] = await RequestGenerator.POST_events(
    PayloadGenerator.createEventPayload({
      internal_costs: [{ type: 'tax', description: 'Licenças', amount: internalCost }],
    }),
    organizerHeaders,
  )
  assert.equal(createStatus, 201)

  if (publish) {
    const [publishStatus] = await RequestGenerator.PATCH_event_status(event.event_key, { status: 'open_for_quotes' }, organizerHeaders)
    assert.equal(publishStatus, 200)
  }

  return event
}

async function createProposal(itemKey, supplierName, options = {}) {
  const { user } = await createUser('fornecedor', supplierName)
  return DbUtils.createProposalFixture(itemKey, user.userKey, options)
}

async function createSelectionScenario({ publish = true, internalCost = 500 } = {}) {
  const organizer = await createUser('organizador')
  const event = await createEvent(organizer.headers, { publish, internalCost })
  const item = await DbUtils.createBudgetItemFixture(event.event_key, { description: 'Sistema de som' })
  const firstProposal = await createProposal(item.itemKey, 'Fornecedor A', {
    amount: 1250,
    validUntil: '2099-01-01',
  })
  const secondProposal = await createProposal(item.itemKey, 'Fornecedor B', {
    amount: 980,
    validUntil: '2099-01-01',
  })

  return { organizer, event, item, firstProposal, secondProposal }
}

describe('POST /events/:event_key/proposals/:proposal_key/accept', () => {
  test('aceita a proposta e soma seu valor aos custos próprios do evento', async () => {
    const { organizer, event, item, firstProposal, secondProposal } = await createSelectionScenario()

    const [status, response] = await RequestGenerator.POST_event_proposal_accept(
      event.event_key,
      firstProposal.proposalKey,
      organizer.headers,
    )

    assert.equal(status, 200)
    assert.equal(response.total_cost, 1750)
    assert.equal(response.items[0].item_key, item.itemKey)
    assert.equal(response.items[0].proposals.find((proposal) => proposal.proposal_key === firstProposal.proposalKey).status, 'accepted')
    assert.equal(response.items[0].proposals.find((proposal) => proposal.proposal_key === secondProposal.proposalKey).status, 'rejected')
  })

  test('preserva propostas aceitas para outros itens ao atualizar o total', async () => {
    const { organizer, event, firstProposal } = await createSelectionScenario()
    const otherItem = await DbUtils.createBudgetItemFixture(event.event_key, { description: 'Iluminação' })
    const otherItemProposal = await createProposal(otherItem.itemKey, 'Fornecedor de iluminação', {
      amount: 400,
      validUntil: '2099-01-01',
    })
    await RequestGenerator.POST_event_proposal_accept(event.event_key, otherItemProposal.proposalKey, organizer.headers)

    const [status, response] = await RequestGenerator.POST_event_proposal_accept(
      event.event_key,
      firstProposal.proposalKey,
      organizer.headers,
    )

    assert.equal(status, 200)
    assert.equal(response.total_cost, 2150)
    const selectedOtherItem = response.items
      .find((budgetItem) => budgetItem.item_key === otherItem.itemKey)
      .proposals.find((proposal) => proposal.proposal_key === otherItemProposal.proposalKey)
    assert.equal(selectedOtherItem.status, 'accepted')
  })

  test('trocar a escolha rejeita a proposta anterior e atualiza o total', async () => {
    const { organizer, event, firstProposal, secondProposal } = await createSelectionScenario()
    await RequestGenerator.POST_event_proposal_accept(event.event_key, firstProposal.proposalKey, organizer.headers)

    const [status, response] = await RequestGenerator.POST_event_proposal_accept(
      event.event_key,
      secondProposal.proposalKey,
      organizer.headers,
    )

    assert.equal(status, 200)
    assert.equal(response.total_cost, 1480)
    const proposals = response.items[0].proposals
    assert.equal(proposals.find((proposal) => proposal.proposal_key === firstProposal.proposalKey).status, 'rejected')
    assert.equal(proposals.find((proposal) => proposal.proposal_key === secondProposal.proposalKey).status, 'accepted')
  })

  test('recusa proposta vencida sem alterar as propostas do item', async () => {
    const { organizer, event, item } = await createSelectionScenario()
    const expiredProposal = await createProposal(item.itemKey, 'Fornecedor vencido', {
      amount: 700,
      validUntil: '2000-01-01',
    })

    const [status, error] = await RequestGenerator.POST_event_proposal_accept(
      event.event_key,
      expiredProposal.proposalKey,
      organizer.headers,
    )
    const [, comparison] = await RequestGenerator.GET_event_proposals(event.event_key, organizer.headers)

    assert.equal(status, 409)
    assert.equal(error.code, 'EVP000034')
    assert.equal(comparison.total_cost, 500)
    assert.ok(comparison.items[0].proposals.every((proposal) => proposal.status !== 'accepted'))
  })

  test('só o organizador dono do evento pode selecionar proposta', async () => {
    const { event, firstProposal } = await createSelectionScenario()
    const supplier = await createUser('fornecedor', 'Fornecedor visitante')
    const otherOrganizer = await createUser('organizador', 'Outro organizador')

    const [anonymousStatus] = await RequestGenerator.POST_event_proposal_accept(event.event_key, firstProposal.proposalKey)
    const [supplierStatus] = await RequestGenerator.POST_event_proposal_accept(event.event_key, firstProposal.proposalKey, supplier.headers)
    const [otherOrganizerStatus, error] = await RequestGenerator.POST_event_proposal_accept(
      event.event_key,
      firstProposal.proposalKey,
      otherOrganizer.headers,
    )

    assert.equal(anonymousStatus, 401)
    assert.equal(supplierStatus, 403)
    assert.equal(otherOrganizerStatus, 404)
    assert.equal(error.code, 'EVP000013')
  })

  test('não aceita proposta de evento que ainda não está em cotação', async () => {
    const { organizer, event, firstProposal } = await createSelectionScenario({ publish: false })

    const [status, error] = await RequestGenerator.POST_event_proposal_accept(event.event_key, firstProposal.proposalKey, organizer.headers)

    assert.equal(status, 409)
    assert.equal(error.code, 'EVP000030')
  })

  test('duas seleções simultâneas para o mesmo item aceitam somente uma', async () => {
    const { organizer, event, firstProposal, secondProposal } = await createSelectionScenario()

    const results = await Promise.all([
      RequestGenerator.POST_event_proposal_accept(event.event_key, firstProposal.proposalKey, organizer.headers),
      RequestGenerator.POST_event_proposal_accept(event.event_key, secondProposal.proposalKey, organizer.headers),
    ])

    assert.deepEqual(results.map(([status]) => status).sort(), [200, 409])
    const [, conflict] = results.find(([status]) => status === 409)
    assert.equal(conflict.code, 'EVP000035')
    const [, comparison] = await RequestGenerator.GET_event_proposals(event.event_key, organizer.headers)
    const acceptedProposals = comparison.items[0].proposals.filter((proposal) => proposal.status === 'accepted')
    assert.equal(acceptedProposals.length, 1)
    assert.equal(comparison.total_cost, 500 + acceptedProposals[0].amount)
  })

  test('proposta inexistente responde 404', async () => {
    const { organizer, event } = await createSelectionScenario()

    const [status, error] = await RequestGenerator.POST_event_proposal_accept(event.event_key, randomUUID(), organizer.headers)

    assert.equal(status, 404)
    assert.equal(error.code, 'EVP000033')
  })

  test('permite recusar proposta vencida', async () => {
    const { organizer, event, item } = await createSelectionScenario()
    const expiredProposal = await createProposal(item.itemKey, 'Fornecedor vencido', {
      amount: 700,
      validUntil: '2000-01-01',
    })

    const [status, comparison] = await RequestGenerator.POST_event_proposal_reject(
      event.event_key,
      expiredProposal.proposalKey,
      organizer.headers,
    )

    assert.equal(status, 200)
    assert.equal(comparison.items[0].proposals.find((proposal) => proposal.proposal_key === expiredProposal.proposalKey).status, 'rejected')
    assert.equal(comparison.total_cost, 500)
  })

  test('aceite e recusa simultâneos da mesma proposta permitem uma única decisão', async () => {
    const { organizer, event, firstProposal } = await createSelectionScenario()

    const results = await Promise.all([
      RequestGenerator.POST_event_proposal_accept(event.event_key, firstProposal.proposalKey, organizer.headers),
      RequestGenerator.POST_event_proposal_reject(event.event_key, firstProposal.proposalKey, organizer.headers),
    ])

    assert.deepEqual(results.map(([status]) => status).sort(), [200, 409])
    const [, conflict] = results.find(([status]) => status === 409)
    assert.equal(conflict.code, 'EVP000035')
  })
})

describe('POST /events/:event_key/proposals/:proposal_key/reject', () => {
  test('recusa proposta enviada sem alterar as outras nem o custo e avisa o fornecedor', async () => {
    const organizer = await createUser('organizador', 'Organizadora de teste')
    const supplier = await createUser('fornecedor', 'Fornecedor recusado')
    const otherSupplier = await createUser('fornecedor', 'Outro fornecedor')
    const event = await createEvent(organizer.headers)
    const item = await DbUtils.createBudgetItemFixture(event.event_key, { description: 'Sistema de som' })
    const proposal = await DbUtils.createProposalFixture(item.itemKey, supplier.user.userKey, {
      amount: 1250,
      validUntil: '2099-01-01',
    })
    const otherProposal = await DbUtils.createProposalFixture(item.itemKey, otherSupplier.user.userKey, {
      amount: 980,
      validUntil: '2099-01-01',
    })

    const [status, comparison] = await RequestGenerator.POST_event_proposal_reject(event.event_key, proposal.proposalKey, organizer.headers)
    const email = await Mailpit.waitForEmailTo(supplier.user.email)
    const [comparisonStatus, currentComparison] = await RequestGenerator.GET_event_proposals(event.event_key, organizer.headers)
    const proposals = comparison.items[0].proposals

    assert.equal(status, 200)
    assert.equal(comparisonStatus, 200)
    assert.equal(comparison.total_cost, currentComparison.total_cost)
    assert.equal(comparison.total_cost, 500)
    assert.equal(proposals.find((current) => current.proposal_key === proposal.proposalKey).status, 'rejected')
    assert.equal(proposals.find((current) => current.proposal_key === otherProposal.proposalKey).status, 'sent')
    assert.equal(email.subject, `Sua proposta para o evento ${event.name} foi recusada`)
    assert.match(email.text, /Sistema de som/)
    assert.match(email.text, /R\$\s?1\.250,00/)
  })

  test('proposta aceita, rejeitada ou cancelada responde 409', async () => {
    const { organizer, event, item, firstProposal, secondProposal } = await createSelectionScenario()
    await RequestGenerator.POST_event_proposal_accept(event.event_key, firstProposal.proposalKey, organizer.headers)
    const canceledProposal = await createProposal(item.itemKey, 'Fornecedor cancelado', { status: 'canceled' })

    for (const proposal of [firstProposal, secondProposal, canceledProposal]) {
      const [status, error] = await RequestGenerator.POST_event_proposal_reject(event.event_key, proposal.proposalKey, organizer.headers)
      assert.equal(status, 409)
      assert.equal(error.code, 'EVP000035')
    }
  })

  test('evento fora de cotação responde 409', async () => {
    const { organizer, event, firstProposal } = await createSelectionScenario({ publish: false })

    const [status, error] = await RequestGenerator.POST_event_proposal_reject(event.event_key, firstProposal.proposalKey, organizer.headers)

    assert.equal(status, 409)
    assert.equal(error.code, 'EVP000030')
  })

  test('só o organizador dono do evento pode recusar proposta', async () => {
    const { event, firstProposal } = await createSelectionScenario()
    const supplier = await createUser('fornecedor', 'Fornecedor visitante')
    const otherOrganizer = await createUser('organizador', 'Outro organizador')

    const [anonymousStatus] = await RequestGenerator.POST_event_proposal_reject(event.event_key, firstProposal.proposalKey)
    const [supplierStatus] = await RequestGenerator.POST_event_proposal_reject(event.event_key, firstProposal.proposalKey, supplier.headers)
    const [otherOrganizerStatus, error] = await RequestGenerator.POST_event_proposal_reject(
      event.event_key,
      firstProposal.proposalKey,
      otherOrganizer.headers,
    )

    assert.equal(anonymousStatus, 401)
    assert.equal(supplierStatus, 403)
    assert.equal(otherOrganizerStatus, 404)
    assert.equal(error.code, 'EVP000013')
  })

  test('proposta inexistente responde 404', async () => {
    const { organizer, event } = await createSelectionScenario()

    const [status, error] = await RequestGenerator.POST_event_proposal_reject(event.event_key, randomUUID(), organizer.headers)

    assert.equal(status, 404)
    assert.equal(error.code, 'EVP000033')
  })
})
