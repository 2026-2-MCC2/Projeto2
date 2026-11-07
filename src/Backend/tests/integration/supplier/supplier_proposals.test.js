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

// evento em cotação com itens de Estrutura e Segurança e uma proposta enviada pelo fornecedor no primeiro item
async function createScenario() {
  const organizer = await createUser('organizador')
  const supplier = await createUser('fornecedor', 'Palcos RF10 Ltda.')
  const { event, items } = await ObjectGenerator.createEventWithItems(organizer.headers, { categories: ['Estrutura', 'Segurança'] })
  const proposal = await ObjectGenerator.sendProposal(event.event_key, items[0].item_key, supplier.headers, { amount: 1500 })
  return { organizer, supplier, event, items, proposal }
}

// o organizador aceita uma proposta do item: as outras propostas do mesmo item ficam rejeitadas
async function decideByOrganizer({ organizer, event }, proposalKeyToAccept) {
  const [status] = await RequestGenerator.POST_event_proposal_accept(event.event_key, proposalKeyToAccept, organizer.headers)
  assert.equal(status, 200)
}

async function closeEvent({ organizer, event, items }) {
  const approvingSupplier = await createUser('fornecedor', 'Fornecedor de aprovação')
  for (const item of items) {
    const proposal = await ObjectGenerator.sendProposal(event.event_key, item.item_key, approvingSupplier.headers)
    await decideByOrganizer({ organizer, event }, proposal.proposal_key)
  }

  const [status] = await RequestGenerator.PATCH_event_status(event.event_key, { status: 'closed' }, organizer.headers)
  assert.equal(status, 200)
}

describe('GET /supplier/proposals', () => {
  test('lista só as propostas do fornecedor logado, da mais recente para a mais antiga', async () => {
    const { supplier, event, items, proposal } = await createScenario()
    const second = await ObjectGenerator.sendProposal(event.event_key, items[1].item_key, supplier.headers, { amount: 800 })
    const otherSupplier = await createUser('fornecedor', 'Outro Fornecedor')
    await ObjectGenerator.sendProposal(event.event_key, items[0].item_key, otherSupplier.headers)

    const [status, response] = await RequestGenerator.GET_supplier_proposals({}, supplier.headers)

    assert.equal(status, 200)
    assert.equal(response.total, 2)
    assert.equal(response.is_last_page, true)
    assert.deepEqual(
      response.data.map((item) => item.proposal_key),
      [second.proposal_key, proposal.proposal_key],
    )
    assert.deepEqual(response.data[1], {
      proposal_key: proposal.proposal_key,
      event: {
        event_key: event.event_key,
        name: event.name,
        status: 'open_for_quotes',
        cancellation_reason: null,
        start_date: `${PayloadGenerator.dateFromToday(20)}T14:00:00.000Z`,
        end_date: `${PayloadGenerator.dateFromToday(30)}T23:00:00.000Z`,
        venue_name: 'Allianz Parque',
        city: 'São Paulo',
        state: 'SP',
      },
      item: { item_key: items[0].item_key, description: 'Estrutura do evento', category: 'Estrutura' },
      amount: 1500,
      valid_until: PayloadGenerator.dateFromToday(7),
      status: 'sent',
      selected: false,
      sent_at: response.data[1].sent_at,
    })
    assert.ok(!Number.isNaN(Date.parse(response.data[1].sent_at)))
  })

  test('filtra por status e pagina', async () => {
    const scenario = await createScenario()
    const { supplier, event, items } = scenario
    const second = await ObjectGenerator.sendProposal(event.event_key, items[1].item_key, supplier.headers)
    await decideByOrganizer(scenario, second.proposal_key)

    const [acceptedStatus, accepted] = await RequestGenerator.GET_supplier_proposals({ status: 'accepted' }, supplier.headers)
    const [sentStatus, sent] = await RequestGenerator.GET_supplier_proposals({ status: 'sent' }, supplier.headers)
    const [pageStatus, page] = await RequestGenerator.GET_supplier_proposals({ limit: 1, page: 0 }, supplier.headers)

    assert.equal(acceptedStatus, 200)
    assert.deepEqual(
      accepted.data.map((item) => [item.proposal_key, item.selected]),
      [[second.proposal_key, true]],
    )
    assert.equal(sentStatus, 200)
    assert.deepEqual(
      sent.data.map((item) => item.proposal_key),
      [scenario.proposal.proposal_key],
    )
    assert.equal(pageStatus, 200)
    assert.equal(page.data.length, 1)
    assert.equal(page.total, 2)
    assert.equal(page.is_last_page, false)
  })

  test('filtra por mais de um status separados por vírgula, nas duas formas de paginação', async () => {
    const scenario = await createScenario()
    const { supplier, event, items, proposal } = scenario
    const second = await ObjectGenerator.sendProposal(event.event_key, items[1].item_key, supplier.headers)
    await decideByOrganizer(scenario, second.proposal_key)

    const [status, response] = await RequestGenerator.GET_supplier_proposals({ status: 'sent,under_review' }, supplier.headers)
    const [bothStatus, both] = await RequestGenerator.GET_supplier_proposals({ status: 'sent,accepted', limit: 1 }, supplier.headers)
    const [nextStatus, next] = await RequestGenerator.GET_supplier_proposals(
      { status: 'sent,accepted', limit: 1, after: both.next_cursor },
      supplier.headers,
    )
    const [invalidStatus, invalid] = await RequestGenerator.GET_supplier_proposals({ status: 'sent,inexistente' }, supplier.headers)
    const [repeatedStatus, repeated] = await RequestGenerator.GET_supplier_proposals(
      { status: 'sent,sent,accepted', after: both.next_cursor },
      supplier.headers,
    )

    assert.equal(status, 200)
    assert.deepEqual(
      response.data.map((item) => item.proposal_key),
      [proposal.proposal_key],
    )
    assert.equal(response.total, 1)
    assert.equal(bothStatus, 200)
    assert.equal(both.total, 2)
    assert.equal(nextStatus, 200)
    assert.equal(next.total, 2)
    assert.deepEqual(
      [...both.data, ...next.data].map((item) => item.proposal_key),
      [second.proposal_key, proposal.proposal_key],
    )
    assert.equal(invalidStatus, 400)
    assert.equal(invalid.code, 'APP000010')
    assert.equal(repeatedStatus, 200)
    assert.equal(repeated.total, 2)
  })

  test('status inválido responde 400, organizador 403 e sem token 401', async () => {
    const { organizer, supplier } = await createScenario()

    const [invalidStatus, invalid] = await RequestGenerator.GET_supplier_proposals({ status: 'inexistente' }, supplier.headers)
    const [organizerStatus, organizerError] = await RequestGenerator.GET_supplier_proposals({}, organizer.headers)
    const [anonymousStatus, anonymousError] = await RequestGenerator.GET_supplier_proposals()

    assert.equal(invalidStatus, 400)
    assert.equal(invalid.code, 'APP000010')
    assert.equal(organizerStatus, 403)
    assert.equal(organizerError.code, 'APP000403')
    assert.equal(anonymousStatus, 401)
    assert.equal(anonymousError.code, 'APP000401')
  })

  test('traz quantas propostas o fornecedor tem em cada status, sem o filtro da lista', async () => {
    const scenario = await createScenario()
    const { supplier, event, items, proposal } = scenario
    await ObjectGenerator.sendProposal(event.event_key, items[1].item_key, supplier.headers)
    await decideByOrganizer(scenario, proposal.proposal_key)

    const [status, response] = await RequestGenerator.GET_supplier_proposals({ status: 'sent' }, supplier.headers)

    assert.equal(status, 200)
    assert.equal(response.total, 1)
    assert.deepEqual(response.counts, { all: 2, sent: 1, under_review: 0, accepted: 1, rejected: 0, canceled: 0, withdrawn: 0 })
  })

  test('a próxima página parte da última proposta mostrada, sem repetir nem pular com proposta nova', async () => {
    const scenario = await createScenario()
    const { supplier, event, items, proposal } = scenario
    const second = await ObjectGenerator.sendProposal(event.event_key, items[1].item_key, supplier.headers)

    const [, firstPage] = await RequestGenerator.GET_supplier_proposals({ limit: 1 }, supplier.headers)
    assert.equal(firstPage.data[0].proposal_key, second.proposal_key)

    // uma proposta nova entre as páginas deslocaria a página 1 por número
    const { event: otherEvent, items: otherItems } = await ObjectGenerator.createEventWithItems(scenario.organizer.headers)
    await ObjectGenerator.sendProposal(otherEvent.event_key, otherItems[0].item_key, supplier.headers)

    const [status, nextPage] = await RequestGenerator.GET_supplier_proposals({ limit: 1, after: firstPage.next_cursor }, supplier.headers)

    assert.equal(status, 200)
    assert.deepEqual(
      nextPage.data.map((item) => item.proposal_key),
      [proposal.proposal_key],
    )
    assert.equal(nextPage.is_last_page, true)
    assert.equal(nextPage.next_cursor, null)
  })

  test('a próxima página carrega mesmo se a última proposta mostrada foi retirada', async () => {
    const { supplier, event, items, proposal } = await createScenario()
    const second = await ObjectGenerator.sendProposal(event.event_key, items[1].item_key, supplier.headers)
    const [, firstPage] = await RequestGenerator.GET_supplier_proposals({ limit: 1 }, supplier.headers)
    assert.equal(firstPage.data[0].proposal_key, second.proposal_key)

    const [deleteStatus] = await RequestGenerator.DELETE_supplier_proposal(second.proposal_key, supplier.headers)
    assert.equal(deleteStatus, 204)
    const [status, nextPage] = await RequestGenerator.GET_supplier_proposals({ limit: 1, after: firstPage.next_cursor }, supplier.headers)

    assert.equal(status, 200)
    assert.deepEqual(
      nextPage.data.map((item) => item.proposal_key),
      [proposal.proposal_key],
    )
  })

  test('cursor inválido responde 400', async () => {
    const { supplier } = await createScenario()

    const [status, response] = await RequestGenerator.GET_supplier_proposals({ after: 'nao-e-um-cursor' }, supplier.headers)

    assert.equal(status, 400)
    assert.equal(response.code, 'APP000010')
  })
  test('proposta de evento cancelado aparece como cancelada, com o motivo, e tem filtro próprio', async () => {
    const scenario = await createScenario()
    await RequestGenerator.PATCH_event_status(
      scenario.event.event_key,
      { status: 'canceled', reason: 'Patrocinador desistiu.' },
      scenario.organizer.headers,
    )

    const [status, page] = await RequestGenerator.GET_supplier_proposals({ status: 'canceled' }, scenario.supplier.headers)
    const [, detail] = await RequestGenerator.GET_supplier_proposal_by_key(scenario.proposal.proposal_key, scenario.supplier.headers)

    assert.equal(status, 200)
    assert.deepEqual(
      page.data.map((proposal) => [proposal.status, proposal.event.cancellation_reason]),
      [['canceled', 'Patrocinador desistiu.']],
    )
    assert.equal(page.counts.canceled, 1)
    assert.equal(detail.status, 'canceled')
    assert.equal(detail.event.cancellation_reason, 'Patrocinador desistiu.')
  })
})

describe('GET /supplier/proposals/:proposal_key', () => {
  test('mostra todos os campos da própria proposta', async () => {
    const { supplier, event, items, proposal } = await createScenario()
    const payload = PayloadGenerator.createSupplierProposalPayload({ amount: 1500 })

    const [status, response] = await RequestGenerator.GET_supplier_proposal_by_key(proposal.proposal_key, supplier.headers)

    assert.equal(status, 200)
    assert.equal(response.proposal_key, proposal.proposal_key)
    assert.equal(response.event.event_key, event.event_key)
    assert.equal(response.event.status, 'open_for_quotes')
    assert.equal(response.event.start_date, `${PayloadGenerator.dateFromToday(20)}T14:00:00.000Z`)
    assert.equal(response.event.end_date, `${PayloadGenerator.dateFromToday(30)}T23:00:00.000Z`)
    assert.equal(response.event.venue_name, 'Allianz Parque')
    assert.deepEqual(response.item, {
      item_key: items[0].item_key,
      description: 'Estrutura do evento',
      category: 'Estrutura',
      type: 'service',
      quantity: 1,
      estimated_value: 2500,
      notes: 'Inclui montagem',
    })
    for (const field of [
      'amount',
      'description',
      'not_included',
      'delivery_terms',
      'payment_terms',
      'team',
      'warranty',
      'valid_until',
      'notes',
    ]) {
      assert.equal(response[field], payload[field], field)
    }
    assert.equal(response.status, 'sent')
    assert.equal(response.selected, false)
    assert.deepEqual(response.photos, [])
    assert.equal(response.organizer_contact, null)
    assert.equal('id' in response, false)
  })

  test('proposta de outro fornecedor responde 404', async () => {
    const { proposal } = await createScenario()
    const otherSupplier = await createUser('fornecedor', 'Outro Fornecedor')

    const [status, response] = await RequestGenerator.GET_supplier_proposal_by_key(proposal.proposal_key, otherSupplier.headers)

    assert.equal(status, 404)
    assert.equal(response.code, 'EVP000033')
  })

  test('contato do organizador aparece só para quem estava com a proposta aceita, também depois do cancelamento', async () => {
    const accepted = await createScenario()
    await decideByOrganizer(accepted, accepted.proposal.proposal_key)
    const canceled = await createScenario()
    await decideByOrganizer(canceled, canceled.proposal.proposal_key)
    await RequestGenerator.PATCH_event_status(
      canceled.event.event_key,
      { status: 'canceled', reason: 'Chuva.' },
      canceled.organizer.headers,
    )
    const canceledWhileSent = await createScenario()
    await RequestGenerator.PATCH_event_status(
      canceledWhileSent.event.event_key,
      { status: 'canceled', reason: 'Chuva.' },
      canceledWhileSent.organizer.headers,
    )
    const rejected = await createScenario()
    const winner = await createUser('fornecedor', 'Fornecedor vencedor')
    const winnerProposal = await ObjectGenerator.sendProposal(rejected.event.event_key, rejected.items[0].item_key, winner.headers)
    await decideByOrganizer(rejected, winnerProposal.proposal_key)

    const contacts = []
    for (const scenario of [accepted, canceled, canceledWhileSent, rejected]) {
      const [, detail] = await RequestGenerator.GET_supplier_proposal_by_key(scenario.proposal.proposal_key, scenario.supplier.headers)
      contacts.push([detail.status, detail.organizer_contact])
    }

    assert.deepEqual(contacts, [
      ['accepted', { name: 'RF10 Test User', email: accepted.organizer.user.email, phone: '11999999999' }],
      ['canceled', { name: 'RF10 Test User', email: canceled.organizer.user.email, phone: '11999999999' }],
      ['canceled', null],
      ['rejected', null],
    ])
  })
})

describe('PUT /supplier/proposals/:proposal_key', () => {
  test('edita a proposta enviada e a mudança aparece para o fornecedor e para o organizador', async () => {
    const { organizer, supplier, event, items, proposal } = await createScenario()
    const payload = PayloadGenerator.createSupplierProposalPayload({
      amount: 1320.4,
      payment_terms: 'À vista com 5% de desconto',
      valid_until: PayloadGenerator.dateFromToday(30),
      team: '',
    })

    const [status, response] = await RequestGenerator.PUT_supplier_proposal(proposal.proposal_key, payload, supplier.headers)

    assert.equal(status, 200)
    assert.equal(response.amount, 1320.4)
    assert.equal(response.payment_terms, 'À vista com 5% de desconto')
    assert.equal(response.valid_until, PayloadGenerator.dateFromToday(30))
    // opcional vazio vira null
    assert.equal(response.team, null)
    assert.equal(response.status, 'sent')

    const [, detail] = await RequestGenerator.GET_supplier_proposal_by_key(proposal.proposal_key, supplier.headers)
    assert.equal(detail.amount, 1320.4)

    const [, comparison] = await RequestGenerator.GET_event_proposals(event.event_key, organizer.headers)
    const comparisonItem = comparison.items.find((item) => item.item_key === items[0].item_key)
    assert.equal(comparisonItem.proposals[0].amount, 1320.4)
  })

  test('proposta aceita ou rejeitada não pode ser editada', async () => {
    const scenario = await createScenario()
    const { supplier, event, items, proposal } = scenario
    const otherSupplier = await createUser('fornecedor', 'Outro Fornecedor')
    const otherProposal = await ObjectGenerator.sendProposal(event.event_key, items[0].item_key, otherSupplier.headers)
    // aceitar a do outro fornecedor rejeita a do cenário
    await decideByOrganizer(scenario, otherProposal.proposal_key)
    const payload = PayloadGenerator.createSupplierProposalPayload()

    const [rejectedStatus, rejected] = await RequestGenerator.PUT_supplier_proposal(proposal.proposal_key, payload, supplier.headers)
    const [acceptedStatus, accepted] = await RequestGenerator.PUT_supplier_proposal(
      otherProposal.proposal_key,
      payload,
      otherSupplier.headers,
    )

    assert.equal(rejectedStatus, 409)
    assert.equal(rejected.code, 'EVP000041')
    assert.equal(acceptedStatus, 409)
    assert.equal(accepted.code, 'EVP000041')
  })

  test('evento encerrado não aceita edição', async () => {
    const scenario = await createScenario()
    await closeEvent(scenario)

    const [status, response] = await RequestGenerator.PUT_supplier_proposal(
      scenario.proposal.proposal_key,
      PayloadGenerator.createSupplierProposalPayload(),
      scenario.supplier.headers,
    )

    assert.equal(status, 409)
    assert.equal(response.code, 'EVP000042')
  })

  test('evento de organizador bloqueado não aceita edição nem retirada', async () => {
    const { organizer, supplier, proposal } = await createScenario()
    await DbUtils.setUserStatus(organizer.user.userKey, 'blocked')

    const [editStatus, edit] = await RequestGenerator.PUT_supplier_proposal(
      proposal.proposal_key,
      PayloadGenerator.createSupplierProposalPayload(),
      supplier.headers,
    )
    const [deleteStatus, deletion] = await RequestGenerator.DELETE_supplier_proposal(proposal.proposal_key, supplier.headers)

    assert.equal(editStatus, 409)
    assert.equal(edit.code, 'EVP000042')
    assert.equal(deleteStatus, 409)
    assert.equal(deletion.code, 'EVP000042')
  })

  test('mesmas validações do envio: validade, valor e campo obrigatório', async () => {
    const { supplier, proposal } = await createScenario()
    const missingTerms = PayloadGenerator.createSupplierProposalPayload()
    delete missingTerms.delivery_terms
    const send = (payload) => RequestGenerator.PUT_supplier_proposal(proposal.proposal_key, payload, supplier.headers)

    const [pastStatus, past] = await send(
      PayloadGenerator.createSupplierProposalPayload({ valid_until: PayloadGenerator.dateFromToday(-1) }),
    )
    const [afterStatus, after] = await send(
      PayloadGenerator.createSupplierProposalPayload({ valid_until: PayloadGenerator.dateFromToday(31) }),
    )
    const [missingDayStatus, missingDay] = await send(PayloadGenerator.createSupplierProposalPayload({ valid_until: '2026-02-30' }))
    const [zeroStatus, zero] = await send(PayloadGenerator.createSupplierProposalPayload({ amount: 0 }))
    const [missingStatus, missing] = await send(missingTerms)

    assert.equal(pastStatus, 400)
    assert.equal(past.code, 'EVP000039')
    assert.equal(afterStatus, 400)
    assert.equal(after.code, 'EVP000040')
    assert.equal(missingDayStatus, 400)
    assert.equal(missingDay.code, 'APP000001')
    assert.equal(zeroStatus, 400)
    assert.equal(zero.code, 'APP000001')
    assert.equal(missingStatus, 400)
    assert.equal(missing.code, 'APP000001')
  })

  test('fornecedor não edita proposta de outro, organizador recebe 403 e sem token 401', async () => {
    const { organizer, proposal } = await createScenario()
    const otherSupplier = await createUser('fornecedor', 'Outro Fornecedor')
    const payload = PayloadGenerator.createSupplierProposalPayload()

    const [otherStatus, other] = await RequestGenerator.PUT_supplier_proposal(proposal.proposal_key, payload, otherSupplier.headers)
    const [organizerStatus, organizerError] = await RequestGenerator.PUT_supplier_proposal(
      proposal.proposal_key,
      payload,
      organizer.headers,
    )
    const [anonymousStatus, anonymousError] = await RequestGenerator.PUT_supplier_proposal(proposal.proposal_key, payload)

    assert.equal(otherStatus, 404)
    assert.equal(other.code, 'EVP000033')
    assert.equal(organizerStatus, 403)
    assert.equal(organizerError.code, 'APP000403')
    assert.equal(anonymousStatus, 401)
    assert.equal(anonymousError.code, 'APP000401')
  })

  test('proposta de evento cancelado responde 409 dizendo que o evento foi cancelado', async () => {
    const scenario = await createScenario()
    await RequestGenerator.PATCH_event_status(
      scenario.event.event_key,
      { status: 'canceled', reason: 'Chuva.' },
      scenario.organizer.headers,
    )

    const [status, response] = await RequestGenerator.PUT_supplier_proposal(
      scenario.proposal.proposal_key,
      PayloadGenerator.createSupplierProposalPayload(),
      scenario.supplier.headers,
    )

    assert.equal(status, 409)
    assert.equal(response.code, 'EVP000041')
    assert.equal(response.translation, 'O organizador cancelou o evento: esta proposta não pode mais ser alterada nem retirada.')
  })
})

describe('DELETE /supplier/proposals/:proposal_key', () => {
  test('retira a proposta enviada, que fica como retirada para os dois lados', async () => {
    const { organizer, supplier, event, items, proposal } = await createScenario()

    const [status, response] = await RequestGenerator.DELETE_supplier_proposal(proposal.proposal_key, supplier.headers)

    assert.equal(status, 204)
    assert.equal(response, null)

    const [detailStatus, detail] = await RequestGenerator.GET_supplier_proposal_by_key(proposal.proposal_key, supplier.headers)
    assert.equal(detailStatus, 200)
    assert.equal(detail.status, 'withdrawn')

    const [, comparison] = await RequestGenerator.GET_event_proposals(event.event_key, organizer.headers)
    const comparisonItem = comparison.items.find((item) => item.item_key === items[0].item_key)
    assert.deepEqual(
      comparisonItem.proposals.map((candidate) => [candidate.proposal_key, candidate.status]),
      [[proposal.proposal_key, 'withdrawn']],
    )

    const [, eventDetail] = await RequestGenerator.GET_supplier_event_by_key(event.event_key, supplier.headers)
    assert.equal(eventDetail.items.find((item) => item.item_key === items[0].item_key).my_proposal.status, 'withdrawn')

    const [, withdrawnList] = await RequestGenerator.GET_supplier_proposals({ status: 'withdrawn' }, supplier.headers)
    assert.deepEqual(
      withdrawnList.data.map((candidate) => candidate.proposal_key),
      [proposal.proposal_key],
    )
    assert.equal(withdrawnList.counts.withdrawn, 1)
    assert.equal(withdrawnList.counts.sent, 0)

    // a retirada não conta como proposta ativa do item
    const [, budgetItems] = await RequestGenerator.GET_event_items(event.event_key, organizer.headers)
    assert.equal(budgetItems.find((item) => item.item_key === items[0].item_key).proposals_count, 0)

    // mas trava o item: apagar levaria junto (cascade) a proposta, as fotos e a conversa
    const withdrawnItem = budgetItems.find((item) => item.item_key === items[0].item_key)
    assert.equal(withdrawnItem.locked, true)
    const [deleteStatus, deleteError] = await RequestGenerator.DELETE_event_item(event.event_key, items[0].item_key, organizer.headers)
    assert.equal(deleteStatus, 409)
    assert.equal(deleteError.code, 'EVP000029')
  })

  test('reenviar para o mesmo item reativa a proposta retirada, com a mesma chave e a conversa', async () => {
    const { organizer, supplier, event, items, proposal } = await createScenario()
    const [messageStatus] = await RequestGenerator.POST_proposal_message(
      proposal.proposal_key,
      { body: 'Inclui frete?' },
      organizer.headers,
    )
    assert.equal(messageStatus, 201)
    await RequestGenerator.DELETE_supplier_proposal(proposal.proposal_key, supplier.headers)

    const payload = PayloadGenerator.createSupplierProposalPayload({ amount: 1350 })
    const [status, response] = await RequestGenerator.POST_supplier_item_proposal(
      event.event_key,
      items[0].item_key,
      payload,
      supplier.headers,
    )

    assert.equal(status, 201)
    assert.deepEqual(response, { proposal_key: proposal.proposal_key, status: 'sent' })
    const [, detail] = await RequestGenerator.GET_supplier_proposal_by_key(proposal.proposal_key, supplier.headers)
    assert.equal(detail.status, 'sent')
    assert.equal(detail.amount, 1350)
    const [, conversation] = await RequestGenerator.GET_proposal_messages(proposal.proposal_key, supplier.headers)
    assert.deepEqual(
      conversation.data.map((message) => message.body),
      ['Inclui frete?'],
    )
    assert.equal(conversation.can_send, true)

    // enviada de novo, um segundo envio volta a ser conflito
    const [againStatus, again] = await RequestGenerator.POST_supplier_item_proposal(
      event.event_key,
      items[0].item_key,
      payload,
      supplier.headers,
    )
    assert.equal(againStatus, 409)
    assert.notEqual(again.code, undefined)
  })

  test('o organizador não aceita nem recusa proposta retirada, e o aceite de outra não a recusa', async () => {
    const scenario = await createScenario()
    const { organizer, supplier, event, items, proposal } = scenario
    await RequestGenerator.DELETE_supplier_proposal(proposal.proposal_key, supplier.headers)

    const [acceptStatus, acceptError] = await RequestGenerator.POST_event_proposal_accept(
      event.event_key,
      proposal.proposal_key,
      organizer.headers,
    )
    const [rejectStatus, rejectError] = await RequestGenerator.POST_event_proposal_reject(
      event.event_key,
      proposal.proposal_key,
      organizer.headers,
    )

    assert.equal(acceptStatus, 409)
    assert.equal(rejectStatus, 409)
    assert.equal(acceptError.code, rejectError.code)

    const otherSupplier = await createUser('fornecedor', 'Outro Palco')
    const other = await ObjectGenerator.sendProposal(event.event_key, items[0].item_key, otherSupplier.headers)
    await decideByOrganizer(scenario, other.proposal_key)
    const [, detail] = await RequestGenerator.GET_supplier_proposal_by_key(proposal.proposal_key, supplier.headers)
    assert.equal(detail.status, 'withdrawn')
  })

  test('cancelar o evento mantém a proposta como retirada', async () => {
    const { organizer, supplier, event, proposal } = await createScenario()
    await RequestGenerator.DELETE_supplier_proposal(proposal.proposal_key, supplier.headers)

    const [cancelStatus] = await RequestGenerator.PATCH_event_status(
      event.event_key,
      { status: 'canceled', reason: 'Evento adiado pela organização.' },
      organizer.headers,
    )

    assert.equal(cancelStatus, 200)
    const [, detail] = await RequestGenerator.GET_supplier_proposal_by_key(proposal.proposal_key, supplier.headers)
    assert.equal(detail.status, 'withdrawn')
  })

  test('proposta aceita ou rejeitada não pode ser retirada', async () => {
    const scenario = await createScenario()
    const { supplier, event, items, proposal } = scenario
    const otherSupplier = await createUser('fornecedor', 'Outro Fornecedor')
    const otherProposal = await ObjectGenerator.sendProposal(event.event_key, items[0].item_key, otherSupplier.headers)
    await decideByOrganizer(scenario, otherProposal.proposal_key)

    const [rejectedStatus, rejected] = await RequestGenerator.DELETE_supplier_proposal(proposal.proposal_key, supplier.headers)
    const [acceptedStatus, accepted] = await RequestGenerator.DELETE_supplier_proposal(otherProposal.proposal_key, otherSupplier.headers)

    assert.equal(rejectedStatus, 409)
    assert.equal(rejected.code, 'EVP000041')
    assert.equal(acceptedStatus, 409)
    assert.equal(accepted.code, 'EVP000041')
  })

  test('evento encerrado não aceita retirada', async () => {
    const scenario = await createScenario()
    await closeEvent(scenario)

    const [status, response] = await RequestGenerator.DELETE_supplier_proposal(scenario.proposal.proposal_key, scenario.supplier.headers)

    assert.equal(status, 409)
    assert.equal(response.code, 'EVP000042')
  })

  test('fornecedor não retira proposta de outro, organizador recebe 403 e sem token 401', async () => {
    const { organizer, supplier, proposal } = await createScenario()
    const otherSupplier = await createUser('fornecedor', 'Outro Fornecedor')

    const [otherStatus, other] = await RequestGenerator.DELETE_supplier_proposal(proposal.proposal_key, otherSupplier.headers)
    const [organizerStatus] = await RequestGenerator.DELETE_supplier_proposal(proposal.proposal_key, organizer.headers)
    const [anonymousStatus] = await RequestGenerator.DELETE_supplier_proposal(proposal.proposal_key)

    assert.equal(otherStatus, 404)
    assert.equal(other.code, 'EVP000033')
    assert.equal(organizerStatus, 403)
    assert.equal(anonymousStatus, 401)

    // a proposta continua lá
    const [detailStatus] = await RequestGenerator.GET_supplier_proposal_by_key(proposal.proposal_key, supplier.headers)
    assert.equal(detailStatus, 200)
  })

  test('requisição comum mandada como multipart continua dentro da transação', async () => {
    const { supplier, proposal } = await createScenario()
    const headers = { ...supplier.headers, 'Content-Type': 'multipart/form-data; boundary=sem-arquivo' }

    const [status] = await RequestGenerator.DELETE_supplier_proposal(proposal.proposal_key, headers)

    assert.equal(status, 204)
    const [, detail] = await RequestGenerator.GET_supplier_proposal_by_key(proposal.proposal_key, supplier.headers)
    assert.equal(detail.status, 'withdrawn')
  })
})
