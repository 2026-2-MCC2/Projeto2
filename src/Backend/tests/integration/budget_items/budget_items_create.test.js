// Testes de integração do cadastro de itens de custo em eventos.

import assert from 'node:assert/strict'
import { afterEach, describe, test } from 'node:test'

import { DbUtils } from '../../utils/db_utils.js'
import { ObjectGenerator } from '../../utils/object_generator.js'
import { PayloadGenerator } from '../../utils/payload_generator.js'
import { RequestGenerator } from '../../utils/request_generator.js'
import { TokenGenerator } from '../../utils/token_generator.js'

const fixtureUserKeys = []

afterEach(async () => DbUtils.deleteUserFixtures(fixtureUserKeys.splice(0)))

async function createOrganizer() {
  const organizer = await ObjectGenerator.createUserFixture({ profile: 'organizador', status: 'approved' })
  fixtureUserKeys.push(organizer.userKey)
  return TokenGenerator.authorizationHeader('organizador', { userKey: organizer.userKey })
}

async function createEvent(headers) {
  const [status, event] = await RequestGenerator.POST_events(PayloadGenerator.createEventPayload({ internal_costs: [] }), headers)
  assert.equal(status, 201)
  return event
}

async function createBudgetItem(eventKey, headers, payload = PayloadGenerator.createBudgetItemPayload()) {
  return RequestGenerator.POST_event_item(eventKey, payload, headers)
}

describe('POST /events/:event_key/items', () => {
  test('organizador cadastra um item válido no próprio evento e ele fica salvo', async () => {
    const headers = await createOrganizer()
    const event = await createEvent(headers)
    const itemPayload = PayloadGenerator.createBudgetItemPayload()
    const [status, response] = await createBudgetItem(event.event_key, headers, itemPayload)

    assert.equal(status, 201)
    assert.ok(response.item_key)
    assert.equal(response.category, itemPayload.category)
    assert.equal(response.description, itemPayload.description)
    assert.equal(response.type, itemPayload.type)
    assert.equal(response.quantity, itemPayload.quantity)
    assert.equal(response.estimated_value, itemPayload.estimated_value)
    assert.equal(response.notes, itemPayload.notes)

    const storedItem = await DbUtils.getBudgetItemByKey(response.item_key)
    assert.deepEqual(storedItem, {
      item_key: response.item_key,
      event_key: event.event_key,
      category: itemPayload.category,
      description: itemPayload.description,
      type: itemPayload.type,
      quantity: itemPayload.quantity,
      estimated_value: '2500.00',
      notes: itemPayload.notes,
    })
  })

  test('rejeita dados fora do schema sem criar o item', async () => {
    const headers = await createOrganizer()
    const event = await createEvent(headers)
    const invalidPayload = PayloadGenerator.createBudgetItemPayload({ quantity: 0 })

    const [status] = await createBudgetItem(event.event_key, headers, invalidPayload)

    assert.equal(status, 400)
    const [listStatus, items] = await RequestGenerator.GET_event_items(event.event_key, headers)
    assert.equal(listStatus, 200)
    assert.equal(items.length, 0)
  })

  test('observação longa demais, quantidade acima do limite e valor com mais de 2 casas respondem 400 sem criar o item', async () => {
    const headers = await createOrganizer()
    const event = await createEvent(headers)

    for (const overrides of [{ notes: 'a'.repeat(2001) }, { quantity: 1000001 }, { estimated_value: 99.999 }]) {
      const [status, response] = await createBudgetItem(event.event_key, headers, PayloadGenerator.createBudgetItemPayload(overrides))
      assert.equal(status, 400, Object.keys(overrides)[0])
      assert.equal(response.code, 'APP000001')
    }

    const [, items] = await RequestGenerator.GET_event_items(event.event_key, headers)
    assert.equal(items.length, 0)
  })

  test('descrição só com espaços e categoria fora da lista respondem 400', async () => {
    const headers = await createOrganizer()
    const event = await createEvent(headers)

    for (const overrides of [{ description: '    ' }, { category: 'Categoria Inexistente' }]) {
      const [status, response] = await createBudgetItem(event.event_key, headers, PayloadGenerator.createBudgetItemPayload(overrides))
      assert.equal(status, 400, JSON.stringify(overrides))
      assert.equal(response.code, 'APP000001')
    }

    const [, items] = await RequestGenerator.GET_event_items(event.event_key, headers)
    assert.equal(items.length, 0)
  })

  test('fornecedor recebe 403 e requisição sem token recebe 401', async () => {
    const organizerHeaders = await createOrganizer()
    const event = await createEvent(organizerHeaders)
    const supplier = await ObjectGenerator.createUserFixture({ profile: 'fornecedor', status: 'approved' })
    fixtureUserKeys.push(supplier.userKey)
    const supplierHeaders = TokenGenerator.authorizationHeader('fornecedor', { userKey: supplier.userKey })

    const [supplierStatus] = await createBudgetItem(event.event_key, supplierHeaders)
    const [anonymousStatus] = await createBudgetItem(event.event_key)

    assert.equal(supplierStatus, 403)
    assert.equal(anonymousStatus, 401)
  })

  test('outro organizador recebe 404 ao tentar criar item no evento', async () => {
    const ownerHeaders = await createOrganizer()
    const event = await createEvent(ownerHeaders)
    const otherOrganizerHeaders = await createOrganizer()

    const [status, response] = await createBudgetItem(event.event_key, otherOrganizerHeaders)

    assert.equal(status, 404)
    assert.equal(response.code, 'EVP000013')
  })
})

describe('GET /events/:event_key/items', () => {
  test('organizador lista os itens com quantidade de propostas e proposta aceita', async () => {
    const headers = await createOrganizer()
    const event = await createEvent(headers)
    const [createStatus, createdItem] = await createBudgetItem(event.event_key, headers)
    assert.equal(createStatus, 201)

    const [status, items] = await RequestGenerator.GET_event_items(event.event_key, headers)

    assert.equal(status, 200)
    assert.equal(items.length, 1)
    assert.equal(items[0].item_key, createdItem.item_key)
    assert.equal(items[0].proposals_count, 0)
    assert.equal(items[0].accepted_proposal, null)
  })

  test('inclui a contagem e os dados da proposta aceita', async () => {
    const headers = await createOrganizer()
    const event = await createEvent(headers)
    const [createStatus, item] = await createBudgetItem(event.event_key, headers)
    assert.equal(createStatus, 201)
    const supplier = await ObjectGenerator.createUserFixture({ profile: 'fornecedor', status: 'approved' })
    fixtureUserKeys.push(supplier.userKey)
    const proposal = await DbUtils.createProposalFixture(item.item_key, supplier.userKey, { status: 'accepted', amount: 1750 })

    const [status, items] = await RequestGenerator.GET_event_items(event.event_key, headers)

    assert.equal(status, 200)
    assert.equal(items[0].proposals_count, 1)
    assert.deepEqual(items[0].accepted_proposal, { proposal_key: proposal.proposalKey, amount: 1750 })
  })
})

describe('Isolamento de itens por organizador', () => {
  test('outro organizador recebe 404 ao consultar, editar ou excluir itens do evento', async () => {
    const ownerHeaders = await createOrganizer()
    const event = await createEvent(ownerHeaders)
    const [createStatus, item] = await createBudgetItem(event.event_key, ownerHeaders)
    assert.equal(createStatus, 201)
    const otherHeaders = await createOrganizer()

    const [listStatus, listError] = await RequestGenerator.GET_event_items(event.event_key, otherHeaders)
    const [updateStatus, updateError] = await RequestGenerator.PUT_event_item(
      event.event_key,
      item.item_key,
      PayloadGenerator.createBudgetItemPayload(),
      otherHeaders,
    )
    const [deleteStatus, deleteError] = await RequestGenerator.DELETE_event_item(event.event_key, item.item_key, otherHeaders)

    assert.equal(listStatus, 404)
    assert.equal(updateStatus, 404)
    assert.equal(deleteStatus, 404)
    assert.equal(listError.code, 'EVP000013')
    assert.equal(updateError.code, 'EVP000013')
    assert.equal(deleteError.code, 'EVP000013')
  })

  test('item inexistente ou ligado a outro evento responde 404 EVP000028', async () => {
    const headers = await createOrganizer()
    const eventA = await createEvent(headers)
    const eventB = await createEvent(headers)
    const [createStatus, item] = await createBudgetItem(eventA.event_key, headers)
    assert.equal(createStatus, 201)

    const [missingStatus, missingError] = await RequestGenerator.DELETE_event_item(
      eventA.event_key,
      '00000000-0000-4000-8000-000000000001',
      headers,
    )
    const [wrongEventStatus, wrongEventError] = await RequestGenerator.DELETE_event_item(eventB.event_key, item.item_key, headers)

    assert.equal(missingStatus, 404)
    assert.equal(wrongEventStatus, 404)
    assert.equal(missingError.code, 'EVP000028')
    assert.equal(wrongEventError.code, 'EVP000028')
  })
})

describe('PUT /events/:event_key/items/:item_key', () => {
  test('organizador atualiza um item sem propostas', async () => {
    const headers = await createOrganizer()
    const event = await createEvent(headers)
    const [createStatus, item] = await createBudgetItem(event.event_key, headers)
    assert.equal(createStatus, 201)

    const updatedPayload = PayloadGenerator.createBudgetItemPayload({
      category: 'Alimentação',
      description: 'Jantar da equipe',
      type: 'product',
      quantity: 12,
      estimated_value: 800,
      notes: 'Servir após o encerramento',
    })
    const [status, updatedItem] = await RequestGenerator.PUT_event_item(event.event_key, item.item_key, updatedPayload, headers)

    assert.equal(status, 200)
    assert.equal(updatedItem.item_key, item.item_key)
    assert.equal(updatedItem.category, updatedPayload.category)
    assert.equal(updatedItem.description, updatedPayload.description)
    assert.equal(updatedItem.type, updatedPayload.type)
    assert.equal(updatedItem.quantity, updatedPayload.quantity)
    assert.equal(updatedItem.estimated_value, updatedPayload.estimated_value)
    assert.equal(updatedItem.notes, updatedPayload.notes)

    const storedItem = await DbUtils.getBudgetItemByKey(item.item_key)
    assert.equal(storedItem.category, updatedPayload.category)
    assert.equal(storedItem.description, updatedPayload.description)
    assert.equal(storedItem.quantity, updatedPayload.quantity)
  })

  test('rejeita edição fora do schema sem alterar o item salvo', async () => {
    const headers = await createOrganizer()
    const event = await createEvent(headers)
    const [createStatus, item] = await createBudgetItem(event.event_key, headers)
    assert.equal(createStatus, 201)
    const invalidPayload = PayloadGenerator.createBudgetItemPayload({ quantity: 0 })

    const [status] = await RequestGenerator.PUT_event_item(event.event_key, item.item_key, invalidPayload, headers)

    assert.equal(status, 400)
    const storedItem = await DbUtils.getBudgetItemByKey(item.item_key)
    assert.equal(storedItem.quantity, 1)
    assert.equal(storedItem.description, 'Palco principal')
  })
})

describe('DELETE /events/:event_key/items/:item_key', () => {
  test('organizador apaga um item sem propostas', async () => {
    const headers = await createOrganizer()
    const event = await createEvent(headers)
    const [createStatus, item] = await createBudgetItem(event.event_key, headers)
    assert.equal(createStatus, 201)

    const [status, response] = await RequestGenerator.DELETE_event_item(event.event_key, item.item_key, headers)

    assert.equal(status, 204)
    assert.equal(response, null)
    assert.equal(await DbUtils.getBudgetItemByKey(item.item_key), null)
  })

  test('organizador não edita nem exclui item que já tem proposta', async () => {
    const headers = await createOrganizer()
    const event = await createEvent(headers)
    const [createStatus, item] = await createBudgetItem(event.event_key, headers)
    assert.equal(createStatus, 201)
    const supplier = await ObjectGenerator.createUserFixture({ profile: 'fornecedor', status: 'approved' })
    fixtureUserKeys.push(supplier.userKey)
    await DbUtils.createProposalFixture(item.item_key, supplier.userKey)

    const [updateStatus, updateError] = await RequestGenerator.PUT_event_item(
      event.event_key,
      item.item_key,
      PayloadGenerator.createBudgetItemPayload({ description: 'Alteração bloqueada' }),
      headers,
    )
    const [deleteStatus, deleteError] = await RequestGenerator.DELETE_event_item(event.event_key, item.item_key, headers)

    assert.equal(updateStatus, 409)
    assert.equal(updateError.code, 'EVP000029')
    assert.equal(deleteStatus, 409)
    assert.equal(deleteError.code, 'EVP000029')
  })

  test('evento cancelado bloqueia criação, edição e exclusão de itens', async () => {
    const headers = await createOrganizer()
    const event = await createEvent(headers)
    const [createStatus, item] = await createBudgetItem(event.event_key, headers)
    assert.equal(createStatus, 201)
    const [cancelStatus] = await RequestGenerator.PATCH_event_status(
      event.event_key,
      { status: 'canceled', reason: 'Teste de bloqueio' },
      headers,
    )
    assert.equal(cancelStatus, 200)

    const [postStatus, postError] = await createBudgetItem(event.event_key, headers)
    const [putStatus, putError] = await RequestGenerator.PUT_event_item(
      event.event_key,
      item.item_key,
      PayloadGenerator.createBudgetItemPayload(),
      headers,
    )
    const [deleteStatus, deleteError] = await RequestGenerator.DELETE_event_item(event.event_key, item.item_key, headers)

    assert.equal(postStatus, 409)
    assert.equal(putStatus, 409)
    assert.equal(deleteStatus, 409)
    assert.equal(postError.code, 'EVP000020')
    assert.equal(putError.code, 'EVP000020')
    assert.equal(deleteError.code, 'EVP000020')
  })

  test('evento encerrado bloqueia criação, edição e exclusão de itens', async () => {
    const headers = await createOrganizer()
    const event = await createEvent(headers)
    const [createStatus, item] = await createBudgetItem(event.event_key, headers)
    assert.equal(createStatus, 201)
    const [publishStatus] = await RequestGenerator.PATCH_event_status(event.event_key, { status: 'open_for_quotes' }, headers)
    assert.equal(publishStatus, 200)
    const [closeStatus] = await RequestGenerator.PATCH_event_status(event.event_key, { status: 'closed' }, headers)
    assert.equal(closeStatus, 200)

    const [postStatus, postError] = await createBudgetItem(event.event_key, headers)
    const [putStatus, putError] = await RequestGenerator.PUT_event_item(
      event.event_key,
      item.item_key,
      PayloadGenerator.createBudgetItemPayload(),
      headers,
    )
    const [deleteStatus, deleteError] = await RequestGenerator.DELETE_event_item(event.event_key, item.item_key, headers)

    assert.equal(postStatus, 409)
    assert.equal(putStatus, 409)
    assert.equal(deleteStatus, 409)
    assert.equal(postError.code, 'EVP000020')
    assert.equal(putError.code, 'EVP000020')
    assert.equal(deleteError.code, 'EVP000020')
  })
})
