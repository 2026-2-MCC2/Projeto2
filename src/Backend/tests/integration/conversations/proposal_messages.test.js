import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { afterEach, describe, test } from 'node:test'

import { DbUtils } from '../../utils/db_utils.js'
import { ObjectGenerator } from '../../utils/object_generator.js'
import { RequestGenerator } from '../../utils/request_generator.js'
import { TokenGenerator } from '../../utils/token_generator.js'

const fixtureUserKeys = []

afterEach(async () => DbUtils.deleteUserFixtures(fixtureUserKeys.splice(0)))

// o fornecedor do DbUtils.createUserFixture atende Estrutura e Segurança
async function createUser(profile, name = 'Conversa Test User') {
  const user = await ObjectGenerator.createUserFixture({ profile, status: 'approved', name })
  fixtureUserKeys.push(user.userKey)
  return { user, headers: TokenGenerator.authorizationHeader(profile, { userKey: user.userKey }) }
}

async function createScenario() {
  const organizer = await createUser('organizador', 'Festival Primavera Produções')
  const supplier = await createUser('fornecedor', 'Sabor & Arte')
  const { event, items } = await ObjectGenerator.createEventWithItems(organizer.headers)
  const proposal = await ObjectGenerator.sendProposal(event.event_key, items[0].item_key, supplier.headers, { amount: 1500 })
  return { organizer, supplier, event, items, proposal }
}

async function sendMessage(proposalKey, body, headers) {
  const [status, message] = await RequestGenerator.POST_proposal_message(proposalKey, { body }, headers)
  assert.equal(status, 201)
  return message
}

describe('POST /proposals/:proposal_key/messages', () => {
  test('os dois lados escrevem e leem a conversa em ordem cronológica', async () => {
    const { organizer, supplier, event, proposal } = await createScenario()

    const first = await sendMessage(proposal.proposal_key, '  Olá, o palco inclui cobertura?  ', organizer.headers)
    const second = await sendMessage(proposal.proposal_key, 'Inclui sim.', supplier.headers)

    assert.equal(first.body, 'Olá, o palco inclui cobertura?')
    assert.equal(first.mine, true)
    assert.equal(first.read, false)
    assert.deepEqual(Object.keys(first).sort(), ['body', 'created_at', 'message_key', 'mine', 'read'])

    const [status, conversation] = await RequestGenerator.GET_proposal_messages(proposal.proposal_key, supplier.headers)
    assert.equal(status, 200)
    assert.deepEqual(conversation.proposal, {
      proposal_key: proposal.proposal_key,
      event_key: event.event_key,
      event_name: event.name,
      event_status: 'open_for_quotes',
      item_description: 'Estrutura do evento',
      amount: 1500,
      status: 'sent',
    })
    assert.deepEqual(conversation.counterpart, { name: 'Festival Primavera Produções', online: false })
    assert.equal(conversation.can_send, true)
    assert.deepEqual(
      conversation.data.map(({ message_key, mine }) => [message_key, mine]),
      [
        [first.message_key, false],
        [second.message_key, true],
      ],
    )

    const [, organizerView] = await RequestGenerator.GET_proposal_messages(proposal.proposal_key, organizer.headers)
    assert.equal(organizerView.counterpart.name, 'Sabor & Arte')
    assert.deepEqual(
      organizerView.data.map((message) => message.mine),
      [true, false],
    )
  })

  test('cada mensagem avisa o outro lado com o link da sua rota', async () => {
    const { organizer, supplier, event, proposal } = await createScenario()

    await sendMessage(proposal.proposal_key, 'Conseguem montar na véspera?', organizer.headers)
    await sendMessage(proposal.proposal_key, 'x'.repeat(300), supplier.headers)

    const [, supplierList] = await RequestGenerator.GET_notifications({}, supplier.headers)
    const [toSupplier] = supplierList.data.filter((notification) => notification.type === 'message')
    assert.equal(toSupplier.title, 'Nova mensagem de Festival Primavera Produções')
    assert.equal(toSupplier.body, 'Conseguem montar na véspera?')
    assert.equal(toSupplier.link, `/fornecedor/propostas/${proposal.proposal_key}`)

    const [, organizerList] = await RequestGenerator.GET_notifications({}, organizer.headers)
    const [toOrganizer] = organizerList.data.filter((notification) => notification.type === 'message')
    assert.equal(toOrganizer.title, 'Nova mensagem de Sabor & Arte')
    assert.equal(toOrganizer.body, `${'x'.repeat(139)}…`)
    assert.equal(toOrganizer.link, `/organizador/eventos/${event.event_key}/propostas/${proposal.proposal_key}`)
  })

  test('recusa mensagem vazia, só com espaços ou maior que 2000 caracteres', async () => {
    const { supplier, proposal } = await createScenario()

    for (const body of ['', '   ', 'a'.repeat(2001)]) {
      const [status, response] = await RequestGenerator.POST_proposal_message(proposal.proposal_key, { body }, supplier.headers)
      assert.equal(status, 400)
      assert.equal(response.code, 'APP000001')
    }
    const [status] = await RequestGenerator.POST_proposal_message(proposal.proposal_key, { body: 'a'.repeat(2000) }, supplier.headers)
    assert.equal(status, 201)
  })

  test('evento cancelado encerra a conversa: envio responde 409 e can_send fica false', async () => {
    const { organizer, supplier, event, proposal } = await createScenario()
    await sendMessage(proposal.proposal_key, 'Antes do cancelamento', supplier.headers)
    await RequestGenerator.PATCH_event_status(event.event_key, { status: 'canceled', reason: 'Chuva' }, organizer.headers)

    const [status, response] = await RequestGenerator.POST_proposal_message(proposal.proposal_key, { body: 'Depois' }, organizer.headers)

    assert.equal(status, 409)
    assert.equal(response.code, 'EVP000050')
    const [, conversation] = await RequestGenerator.GET_proposal_messages(proposal.proposal_key, supplier.headers)
    assert.equal(conversation.can_send, false)
    assert.equal(conversation.proposal.event_status, 'canceled')
    assert.equal(conversation.data.length, 1)
  })

  test('evento encerrado também deixa a conversa só leitura', async () => {
    const { organizer, supplier, event, proposal } = await createScenario()
    await RequestGenerator.POST_event_proposal_accept(event.event_key, proposal.proposal_key, organizer.headers)
    const [closeStatus] = await RequestGenerator.PATCH_event_status(event.event_key, { status: 'closed' }, organizer.headers)
    assert.equal(closeStatus, 200)

    const [status, response] = await RequestGenerator.POST_proposal_message(proposal.proposal_key, { body: 'Obrigado!' }, supplier.headers)

    assert.equal(status, 409)
    assert.equal(response.code, 'EVP000050')
    const [, conversation] = await RequestGenerator.GET_proposal_messages(proposal.proposal_key, organizer.headers)
    assert.equal(conversation.can_send, false)
  })
})

describe('Acesso à conversa', () => {
  test('outro fornecedor, outro organizador ou proposta inexistente respondem 404', async () => {
    const { proposal } = await createScenario()
    const otherSupplier = await createUser('fornecedor')
    const otherOrganizer = await createUser('organizador')

    for (const headers of [otherSupplier.headers, otherOrganizer.headers]) {
      const [getStatus, response] = await RequestGenerator.GET_proposal_messages(proposal.proposal_key, headers)
      const [postStatus] = await RequestGenerator.POST_proposal_message(proposal.proposal_key, { body: 'Oi' }, headers)
      const [readStatus] = await RequestGenerator.POST_proposal_messages_read(proposal.proposal_key, headers)
      assert.equal(getStatus, 404)
      assert.equal(response.code, 'EVP000033')
      assert.equal(postStatus, 404)
      assert.equal(readStatus, 404)
    }
    const [unknownStatus] = await RequestGenerator.GET_proposal_messages(randomUUID(), otherSupplier.headers)
    assert.equal(unknownStatus, 404)
  })

  test('admin recebe 403', async () => {
    const { proposal } = await createScenario()
    const admin = await createUser('admin')

    const [getStatus] = await RequestGenerator.GET_proposal_messages(proposal.proposal_key, admin.headers)
    const [postStatus] = await RequestGenerator.POST_proposal_message(proposal.proposal_key, { body: 'Oi' }, admin.headers)
    const [unreadStatus] = await RequestGenerator.GET_messages_unread(admin.headers)

    assert.equal(getStatus, 403)
    assert.equal(postStatus, 403)
    assert.equal(unreadStatus, 403)
  })

  test('retirar a proposta mantém a conversa, só leitura, e ela continua na aba Chats', async () => {
    const { organizer, supplier, proposal } = await createScenario()
    const first = await sendMessage(proposal.proposal_key, 'Pergunta', organizer.headers)
    const second = await sendMessage(proposal.proposal_key, 'Resposta', supplier.headers)

    const [status] = await RequestGenerator.DELETE_supplier_proposal(proposal.proposal_key, supplier.headers)

    assert.equal(status, 204)
    assert.equal(await DbUtils.countProposalMessages([first.message_key, second.message_key]), 2)
    const [getStatus, conversation] = await RequestGenerator.GET_proposal_messages(proposal.proposal_key, organizer.headers)
    assert.equal(getStatus, 200)
    assert.equal(conversation.proposal.status, 'withdrawn')
    assert.equal(conversation.can_send, false)
    const [sendStatus, sendError] = await RequestGenerator.POST_proposal_message(
      proposal.proposal_key,
      { body: 'Ainda aí?' },
      organizer.headers,
    )
    assert.equal(sendStatus, 409)
    assert.equal(sendError.code, 'EVP000050')

    const [, conversations] = await RequestGenerator.GET_conversations(organizer.headers)
    const listed = conversations.data.find((item) => item.proposal_key === proposal.proposal_key)
    assert.equal(listed.proposal_status, 'withdrawn')
  })
})

describe('Mensagens não lidas', () => {
  test('conta as mensagens do outro lado por proposta e zera ao marcar como lidas', async () => {
    const { organizer, supplier, event, items, proposal } = await createScenario()
    const otherProposal = await ObjectGenerator.sendProposal(event.event_key, items[0].item_key, (await createUser('fornecedor')).headers)
    await sendMessage(proposal.proposal_key, 'Primeira', organizer.headers)
    await sendMessage(proposal.proposal_key, 'Segunda', organizer.headers)
    await sendMessage(proposal.proposal_key, 'Minha', supplier.headers)
    await sendMessage(otherProposal.proposal_key, 'Para outro fornecedor', organizer.headers)

    const [status, unread] = await RequestGenerator.GET_messages_unread(supplier.headers)

    assert.equal(status, 200)
    assert.deepEqual(unread, { total: 2, by_proposal: { [proposal.proposal_key]: 2 } })
    const [, organizerUnread] = await RequestGenerator.GET_messages_unread(organizer.headers)
    assert.deepEqual(organizerUnread, { total: 1, by_proposal: { [proposal.proposal_key]: 1 } })

    const [readStatus] = await RequestGenerator.POST_proposal_messages_read(proposal.proposal_key, supplier.headers)

    assert.equal(readStatus, 204)
    const [, afterRead] = await RequestGenerator.GET_messages_unread(supplier.headers)
    assert.deepEqual(afterRead, { total: 0, by_proposal: {} })
    const [, organizerView] = await RequestGenerator.GET_proposal_messages(proposal.proposal_key, organizer.headers)
    assert.deepEqual(
      organizerView.data.map((message) => [message.body, message.read]),
      [
        ['Primeira', true],
        ['Segunda', true],
        ['Minha', false],
      ],
    )
  })

  test('ler a conversa também marca como lidas as notificações de mensagem dela', async () => {
    const organizer = await createUser('organizador')
    const supplier = await createUser('fornecedor')
    const { event, items } = await ObjectGenerator.createEventWithItems(organizer.headers, { categories: ['Estrutura', 'Segurança'] })
    const proposal = await ObjectGenerator.sendProposal(event.event_key, items[0].item_key, supplier.headers)
    const otherProposal = await ObjectGenerator.sendProposal(event.event_key, items[1].item_key, supplier.headers)
    await sendMessage(proposal.proposal_key, 'Primeira', organizer.headers)
    await sendMessage(otherProposal.proposal_key, 'De outra conversa', organizer.headers)

    await RequestGenerator.POST_proposal_messages_read(proposal.proposal_key, supplier.headers)

    const [, notifications] = await RequestGenerator.GET_notifications({}, supplier.headers)
    const messages = notifications.data.filter((notification) => notification.type === 'message')
    assert.deepEqual(
      messages.map((notification) => [notification.body, notification.read]),
      [
        ['De outra conversa', false],
        ['Primeira', true],
      ],
    )
  })
})

describe('Conversa com conta bloqueada', () => {
  test('organizador bloqueado encerra a conversa para o fornecedor', async () => {
    const { organizer, supplier, proposal } = await createScenario()
    await DbUtils.setUserStatus(organizer.user.userKey, 'blocked')

    const [, conversation] = await RequestGenerator.GET_proposal_messages(proposal.proposal_key, supplier.headers)
    const [status, error] = await RequestGenerator.POST_proposal_message(proposal.proposal_key, { body: 'Ainda aí?' }, supplier.headers)

    assert.equal(conversation.can_send, false)
    assert.equal(status, 409)
    assert.equal(error.code, 'EVP000050')
  })
})

describe('GET /conversations', () => {
  test('lista as conversas com mensagem, da mais recente, com o outro lado e as não lidas', async () => {
    const organizer = await createUser('organizador', 'Festival Primavera Produções')
    const supplier = await createUser('fornecedor', 'Sabor & Arte')
    const { event, items } = await ObjectGenerator.createEventWithItems(organizer.headers, { categories: ['Estrutura', 'Segurança'] })
    const older = await ObjectGenerator.sendProposal(event.event_key, items[0].item_key, supplier.headers)
    const newer = await ObjectGenerator.sendProposal(event.event_key, items[1].item_key, supplier.headers)
    await ObjectGenerator.sendProposal(event.event_key, items[0].item_key, (await createUser('fornecedor')).headers)
    await sendMessage(older.proposal_key, 'Primeira', organizer.headers)
    await sendMessage(older.proposal_key, 'Segunda', organizer.headers)
    await sendMessage(newer.proposal_key, 'Minha pergunta', supplier.headers)

    const [status, response] = await RequestGenerator.GET_conversations(supplier.headers)

    assert.equal(status, 200)
    assert.deepEqual(
      response.data.map((conversation) => conversation.proposal_key),
      [newer.proposal_key, older.proposal_key],
    )
    const [first, second] = response.data
    assert.deepEqual(Object.keys(first).sort(), [
      'counterpart',
      'event_key',
      'event_name',
      'item_description',
      'last_message',
      'proposal_key',
      'proposal_status',
      'unread',
    ])
    assert.deepEqual(first.counterpart, { name: 'Festival Primavera Produções', online: false })
    assert.equal(first.last_message.body, 'Minha pergunta')
    assert.equal(first.last_message.mine, true)
    assert.equal(first.unread, 0)
    assert.equal(second.last_message.body, 'Segunda')
    assert.equal(second.last_message.mine, false)
    assert.equal(second.unread, 2)

    const [, organizerView] = await RequestGenerator.GET_conversations(organizer.headers)
    assert.equal(organizerView.data.length, 2)
    assert.equal(organizerView.data[0].counterpart.name, 'Sabor & Arte')
    assert.equal(organizerView.data[0].unread, 1)
  })

  test('admin recebe 403', async () => {
    const admin = await createUser('admin')

    const [status, error] = await RequestGenerator.GET_conversations(admin.headers)

    assert.equal(status, 403)
    assert.equal(error.code, 'APP000403')
  })
})
