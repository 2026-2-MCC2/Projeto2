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

  test('validade antes de hoje, depois do fim do evento ou inexistente responde 400', async () => {
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
    const [missingDayStatus, missingDay] = await send('2026-02-30')

    assert.equal(pastStatus, 400)
    assert.equal(past.code, 'EVP000039')
    assert.equal(afterStatus, 400)
    assert.equal(after.code, 'EVP000040')
    assert.equal(missingDayStatus, 400)
    assert.equal(missingDay.code, 'APP000001')
    assert.equal(missingDay.translation, 'A data de validade informada não existe no calendário.')
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

  test('valor com mais de 2 casas decimais responde 400 sem gravar a proposta', async () => {
    const { supplier, event, items } = await createScenario()

    const [status, response] = await RequestGenerator.POST_supplier_item_proposal(
      event.event_key,
      items[0].item_key,
      PayloadGenerator.createSupplierProposalPayload({ amount: 0.001 }),
      supplier.headers,
    )

    assert.equal(status, 400)
    assert.equal(response.code, 'APP000001')
    const [, proposals] = await RequestGenerator.GET_supplier_proposals({}, supplier.headers)
    assert.equal(proposals.total, 0)
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

  test('validade de hoje, no dia de Brasília, é aceita a qualquer hora', async () => {
    const { supplier, event, items } = await createScenario()
    const payload = PayloadGenerator.createSupplierProposalPayload({ valid_until: PayloadGenerator.dateFromToday(0) })

    const [status, response] = await RequestGenerator.POST_supplier_item_proposal(
      event.event_key,
      items[0].item_key,
      payload,
      supplier.headers,
    )

    assert.equal(status, 201, JSON.stringify(response))
  })

  test('item que já tem proposta aceita não recebe proposta nova (409 EVP000047)', async () => {
    const { organizer, supplier, event, items } = await createScenario()
    const accepted = await ObjectGenerator.sendProposal(event.event_key, items[0].item_key, supplier.headers)
    const [acceptStatus] = await RequestGenerator.POST_event_proposal_accept(event.event_key, accepted.proposal_key, organizer.headers)
    assert.equal(acceptStatus, 200)
    const otherSupplier = await createUser('fornecedor', 'Outro Palco RF10')

    // o detalhe do evento já avisa, antes de o fornecedor preencher a proposta
    const [, detail] = await RequestGenerator.GET_supplier_event_by_key(event.event_key, otherSupplier.headers)
    assert.equal(detail.items.find((candidate) => candidate.item_key === items[0].item_key).decided, true)

    const [status, response] = await RequestGenerator.POST_supplier_item_proposal(
      event.event_key,
      items[0].item_key,
      PayloadGenerator.createSupplierProposalPayload(),
      otherSupplier.headers,
    )

    assert.equal(status, 409)
    assert.equal(response.code, 'EVP000047')
  })
})
