// Testes de integração do envio de proposta pelo fornecedor (RF10).

import assert from 'node:assert/strict'
import { afterEach, describe, test } from 'node:test'

import { DbUtils } from '../../utils/db_utils.js'
import { ObjectGenerator } from '../../utils/object_generator.js'
import { PayloadGenerator } from '../../utils/payload_generator.js'
import { RequestGenerator } from '../../utils/request_generator.js'
import { TokenGenerator } from '../../utils/token_generator.js'

const fixtureUserKeys = []

afterEach(async () => DbUtils.deleteUserFixtures(fixtureUserKeys.splice(0)))

// o fornecedor do DbUtils.createUserFixture atende Estrutura e Segurança
async function createUser(profile, name = 'RF10 Test User') {
  const user = await ObjectGenerator.createUserFixture({ profile, status: 'approved', name })
  fixtureUserKeys.push(user.userKey)
  return { user, headers: TokenGenerator.authorizationHeader(profile, { userKey: user.userKey }) }
}

async function createScenario(eventOptions) {
  const organizer = await createUser('organizador')
  const supplier = await createUser('fornecedor', 'Palcos RF10 Ltda.')
  const { event, items } = await ObjectGenerator.createEventWithItems(organizer.headers, eventOptions)
  return { organizer, supplier, event, items }
}

describe('POST /supplier/events/:event_key/items/:item_key/proposals', () => {
  test('fornecedor envia proposta enviada e ela aparece para ele e para o organizador', async () => {
    const { organizer, supplier, event, items } = await createScenario()
    const [item] = items
    const payload = PayloadGenerator.createSupplierProposalPayload({ amount: 1850.75 })

    const [status, response] = await RequestGenerator.POST_supplier_item_proposal(event.event_key, item.item_key, payload, supplier.headers)

    assert.equal(status, 201)
    assert.deepEqual(Object.keys(response).sort(), ['proposal_key', 'status'])
    assert.equal(response.status, 'sent')

    // o fornecedor vê a própria proposta no detalhe do evento
    const [detailStatus, detail] = await RequestGenerator.GET_supplier_event_by_key(event.event_key, supplier.headers)
    assert.equal(detailStatus, 200)
    const detailItem = detail.items.find((candidate) => candidate.item_key === item.item_key)
    assert.deepEqual(detailItem.my_proposal, {
      proposal_key: response.proposal_key,
      status: 'sent',
      amount: 1850.75,
      valid_until: payload.valid_until,
    })

    // o organizador vê a proposta na comparação do item
    const [comparisonStatus, comparison] = await RequestGenerator.GET_event_proposals(event.event_key, organizer.headers)
    assert.equal(comparisonStatus, 200)
    const comparisonItem = comparison.items.find((candidate) => candidate.item_key === item.item_key)
    assert.equal(comparisonItem.proposals.length, 1)
    assert.equal(comparisonItem.proposals[0].proposal_key, response.proposal_key)
    assert.equal(comparisonItem.proposals[0].supplier_name, 'Palcos RF10 Ltda.')
    assert.equal(comparisonItem.proposals[0].amount, 1850.75)
    assert.equal(comparisonItem.proposals[0].status, 'sent')
    assert.equal(comparisonItem.proposals[0].is_expired, false)
  })

  test('segunda proposta do mesmo fornecedor para o item responde 409', async () => {
    const { supplier, event, items } = await createScenario()
    const payload = PayloadGenerator.createSupplierProposalPayload()

    const [firstStatus] = await RequestGenerator.POST_supplier_item_proposal(event.event_key, items[0].item_key, payload, supplier.headers)
    const [status, response] = await RequestGenerator.POST_supplier_item_proposal(
      event.event_key,
      items[0].item_key,
      payload,
      supplier.headers,
    )

    assert.equal(firstStatus, 201)
    assert.equal(status, 409)
    assert.equal(response.code, 'EVP000038')
  })

  test('duas propostas simultâneas do mesmo fornecedor para o item aceitam só uma', async () => {
    const { supplier, event, items } = await createScenario()
    const payload = PayloadGenerator.createSupplierProposalPayload()

    const results = await Promise.all([
      RequestGenerator.POST_supplier_item_proposal(event.event_key, items[0].item_key, payload, supplier.headers),
      RequestGenerator.POST_supplier_item_proposal(event.event_key, items[0].item_key, payload, supplier.headers),
    ])

    assert.deepEqual(results.map(([status]) => status).sort(), [201, 409])
  })

  test('outro fornecedor pode enviar proposta para o mesmo item', async () => {
    const { supplier, event, items } = await createScenario()
    const otherSupplier = await createUser('fornecedor', 'Outro Fornecedor')
    const payload = PayloadGenerator.createSupplierProposalPayload()

    const [firstStatus] = await RequestGenerator.POST_supplier_item_proposal(event.event_key, items[0].item_key, payload, supplier.headers)
    const [secondStatus] = await RequestGenerator.POST_supplier_item_proposal(
      event.event_key,
      items[0].item_key,
      payload,
      otherSupplier.headers,
    )

    assert.equal(firstStatus, 201)
    assert.equal(secondStatus, 201)
  })

  test('evento ainda não publicado responde 404', async () => {
    const { supplier, event, items } = await createScenario({ publish: false })

    const [status, response] = await RequestGenerator.POST_supplier_item_proposal(
      event.event_key,
      items[0].item_key,
      PayloadGenerator.createSupplierProposalPayload(),
      supplier.headers,
    )

    assert.equal(status, 404)
    assert.equal(response.code, 'EVP000013')
  })

  test('item de uma categoria que o fornecedor não atende responde 404', async () => {
    const { supplier, event, items } = await createScenario({ categories: ['Estrutura', 'Alimentação'] })
    const otherCategoryItem = items.find((item) => item.category === 'Alimentação') ?? items[1]

    const [status, response] = await RequestGenerator.POST_supplier_item_proposal(
      event.event_key,
      otherCategoryItem.item_key,
      PayloadGenerator.createSupplierProposalPayload(),
      supplier.headers,
    )

    assert.equal(status, 404)
    assert.equal(response.code, 'EVP000028')
  })

  test('item de outro evento responde 404', async () => {
    const { organizer, supplier, event } = await createScenario()
    const otherEvent = await ObjectGenerator.createEventWithItems(organizer.headers)

    const [status, response] = await RequestGenerator.POST_supplier_item_proposal(
      event.event_key,
      otherEvent.items[0].item_key,
      PayloadGenerator.createSupplierProposalPayload(),
      supplier.headers,
    )

    assert.equal(status, 404)
    assert.equal(response.code, 'EVP000028')
  })

  test('validade antes de hoje ou depois do fim do evento responde 400', async () => {
    const { supplier, event, items } = await createScenario()
    const send = (validUntil) =>
      RequestGenerator.POST_supplier_item_proposal(
        event.event_key,
        items[0].item_key,
        PayloadGenerator.createSupplierProposalPayload({ valid_until: validUntil }),
        supplier.headers,
      )

    const [pastStatus, past] = await send(PayloadGenerator.dateFromToday(-1))
    const [afterStatus, after] = await send(PayloadGenerator.dateFromToday(31))
    const [lastDayStatus] = await send(PayloadGenerator.dateFromToday(30))

    assert.equal(pastStatus, 400)
    assert.equal(past.code, 'EVP000039')
    assert.equal(afterStatus, 400)
    assert.equal(after.code, 'EVP000040')
    // o último dia do evento ainda vale
    assert.equal(lastDayStatus, 201)
  })

  test('valor zero ou campo obrigatório faltando responde 400', async () => {
    const { supplier, event, items } = await createScenario()
    const missingTerms = PayloadGenerator.createSupplierProposalPayload()
    delete missingTerms.payment_terms

    const [zeroStatus, zero] = await RequestGenerator.POST_supplier_item_proposal(
      event.event_key,
      items[0].item_key,
      PayloadGenerator.createSupplierProposalPayload({ amount: 0 }),
      supplier.headers,
    )
    const [missingStatus, missing] = await RequestGenerator.POST_supplier_item_proposal(
      event.event_key,
      items[0].item_key,
      missingTerms,
      supplier.headers,
    )

    assert.equal(zeroStatus, 400)
    assert.equal(zero.code, 'APP000001')
    assert.equal(missingStatus, 400)
    assert.equal(missing.code, 'APP000001')
  })

  test('organizador recebe 403 e sem token recebe 401', async () => {
    const { organizer, event, items } = await createScenario()
    const payload = PayloadGenerator.createSupplierProposalPayload()

    const [organizerStatus, organizerError] = await RequestGenerator.POST_supplier_item_proposal(
      event.event_key,
      items[0].item_key,
      payload,
      organizer.headers,
    )
    const [anonymousStatus, anonymousError] = await RequestGenerator.POST_supplier_item_proposal(
      event.event_key,
      items[0].item_key,
      payload,
    )

    assert.equal(organizerStatus, 403)
    assert.equal(organizerError.code, 'APP000403')
    assert.equal(anonymousStatus, 401)
    assert.equal(anonymousError.code, 'APP000401')
  })
})
