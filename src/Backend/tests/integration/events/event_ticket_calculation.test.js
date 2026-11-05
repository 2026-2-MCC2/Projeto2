// Testes de integração do custo consolidado usado no cálculo do ticket.

import assert from 'node:assert/strict'
import { afterEach, describe, test } from 'node:test'

import { DbUtils } from '../../utils/db_utils.js'
import { ObjectGenerator } from '../../utils/object_generator.js'
import { PayloadGenerator } from '../../utils/payload_generator.js'
import { RequestGenerator } from '../../utils/request_generator.js'
import { TokenGenerator } from '../../utils/token_generator.js'

const fixtureUserKeys = []

afterEach(async () => DbUtils.deleteUserFixtures(fixtureUserKeys.splice(0)))

describe('Cálculo do ticket do evento', () => {
  test('GET do evento soma custos próprios e propostas aceitas no custo consolidado', async () => {
    const organizer = await ObjectGenerator.createUserFixture({ profile: 'organizador', status: 'approved' })
    const supplier = await ObjectGenerator.createUserFixture({ profile: 'fornecedor', status: 'approved' })
    fixtureUserKeys.push(organizer.userKey, supplier.userKey)
    const headers = TokenGenerator.authorizationHeader('organizador', { userKey: organizer.userKey })
    const [createStatus, event] = await RequestGenerator.POST_events(
      PayloadGenerator.createEventPayload({
        internal_costs: [{ type: 'tax', description: 'Alvará', amount: 1000 }],
      }),
      headers,
    )
    assert.equal(createStatus, 201)

    const item = await DbUtils.createBudgetItemFixture(event.event_key)
    const proposal = await DbUtils.createProposalFixture(item.itemKey, supplier.userKey, { amount: 2500 })
    await RequestGenerator.PATCH_event_status(event.event_key, { status: 'open_for_quotes' }, headers)
    const [acceptStatus] = await RequestGenerator.POST_event_proposal_accept(event.event_key, proposal.proposalKey, headers)
    assert.equal(acceptStatus, 200)

    const [status, response] = await RequestGenerator.GET_event_by_key(event.event_key, headers)
    const [, proposalSummary] = await RequestGenerator.GET_event_proposals(event.event_key, headers)

    assert.equal(status, 200)
    assert.equal(proposalSummary.total_cost, 3500)
    assert.equal(proposalSummary.items[0].proposals[0].status, 'accepted')
    assert.equal(response.total_internal_cost, 1000)
    assert.equal(response.total_accepted_proposals, 2500, JSON.stringify(response))
    assert.equal(response.total_cost, 3500)
  })

  test('a lista de eventos traz o mesmo custo consolidado do detalhe', async () => {
    const organizer = await ObjectGenerator.createUserFixture({ profile: 'organizador', status: 'approved' })
    const supplier = await ObjectGenerator.createUserFixture({ profile: 'fornecedor', status: 'approved' })
    fixtureUserKeys.push(organizer.userKey, supplier.userKey)
    const headers = TokenGenerator.authorizationHeader('organizador', { userKey: organizer.userKey })
    const [createStatus, event] = await RequestGenerator.POST_events(
      PayloadGenerator.createEventPayload({
        internal_costs: [{ type: 'tax', description: 'Alvará', amount: 1000 }],
      }),
      headers,
    )
    assert.equal(createStatus, 201)
    const [, eventWithoutProposals] = await RequestGenerator.POST_events(PayloadGenerator.createEventPayload(), headers)

    const item = await DbUtils.createBudgetItemFixture(event.event_key)
    await DbUtils.createProposalFixture(item.itemKey, supplier.userKey, { amount: 2500, status: 'accepted' })

    const [listStatus, list] = await RequestGenerator.GET_events({}, headers)
    const [, detail] = await RequestGenerator.GET_event_by_key(event.event_key, headers)

    assert.equal(listStatus, 200)
    const listedEvent = list.data.find((listed) => listed.event_key === event.event_key)
    assert.equal(listedEvent.total_accepted_proposals, 2500)
    assert.equal(listedEvent.total_cost, 3500)
    assert.equal(listedEvent.total_cost, detail.total_cost)

    const listedWithoutProposals = list.data.find((listed) => listed.event_key === eventWithoutProposals.event_key)
    assert.equal(listedWithoutProposals.total_accepted_proposals, 0)
  })
})
