import assert from 'node:assert/strict'
import { setTimeout as sleep } from 'node:timers/promises'
import { afterEach, describe, test } from 'node:test'

import { DbUtils } from '../../utils/db_utils.js'
import { ObjectGenerator } from '../../utils/object_generator.js'
import { RequestGenerator } from '../../utils/request_generator.js'
import { TokenGenerator } from '../../utils/token_generator.js'
import { WebSocketClient } from '../../utils/websocket_client.js'

const fixtureUserKeys = []
const openClients = []

afterEach(async () => {
  await Promise.all(openClients.splice(0).map((client) => client.close()))
  await DbUtils.deleteUserFixtures(fixtureUserKeys.splice(0))
})

async function createUser(profile, name = 'WebSocket Test User', status = 'approved') {
  const user = await ObjectGenerator.createUserFixture({ profile, status, name })
  fixtureUserKeys.push(user.userKey)
  const token = TokenGenerator.create(profile, { userKey: user.userKey })
  return { user, token, headers: { Authorization: `Bearer ${token}` } }
}

async function connectAs({ token }) {
  const client = await WebSocketClient.connectAs(token)
  openClients.push(client)
  return client
}

async function createScenario() {
  const organizer = await createUser('organizador', 'Festival Primavera Produções')
  const supplier = await createUser('fornecedor', 'Sabor & Arte')
  const { event, items } = await ObjectGenerator.createEventWithItems(organizer.headers)
  const proposal = await ObjectGenerator.sendProposal(event.event_key, items[0].item_key, supplier.headers)
  return { organizer, supplier, event, items, proposal }
}

describe('WebSocket /event_planning/ws', () => {
  test('token inválido é recusado', async () => {
    const client = await WebSocketClient.connect()
    openClients.push(client)

    client.send({ type: 'auth', token: 'token-invalido' })

    assert.deepEqual(await client.closed, { code: 4401, reason: 'Unauthorized' })
  })

  test('conta bloqueada é recusada', async () => {
    const blocked = await createUser('fornecedor', 'Bloqueado', 'blocked')
    const client = await WebSocketClient.connect()
    openClients.push(client)

    client.send({ type: 'auth', token: blocked.token })

    assert.deepEqual(await client.closed, { code: 4403, reason: 'Forbidden' })
  })

  test('o organizador recebe a notificação quando chega uma proposta', async () => {
    const organizer = await createUser('organizador')
    const supplier = await createUser('fornecedor', 'Palco Brasil')
    const { event, items } = await ObjectGenerator.createEventWithItems(organizer.headers)
    const client = await connectAs(organizer)

    const proposal = await ObjectGenerator.sendProposal(event.event_key, items[0].item_key, supplier.headers)

    const { notification } = await client.waitFor((message) => message.type === 'notification')
    assert.equal(notification.type, 'proposal_received')
    assert.equal(notification.link, `/organizador/eventos/${event.event_key}/propostas/${proposal.proposal_key}`)
    const [, list] = await RequestGenerator.GET_notifications({}, organizer.headers)
    assert.deepEqual(notification, list.data[0])
  })

  test('mensagem nova chega ao outro lado e às outras abas de quem enviou', async () => {
    const { organizer, supplier, proposal } = await createScenario()
    const supplierClient = await connectAs(supplier)
    const organizerClient = await connectAs(organizer)

    const [status, sent] = await RequestGenerator.POST_proposal_message(proposal.proposal_key, { body: 'Tudo certo?' }, organizer.headers)

    assert.equal(status, 201)
    const received = await supplierClient.waitFor((message) => message.type === 'message')
    assert.deepEqual(received, { type: 'message', proposal_key: proposal.proposal_key, message: { ...sent, mine: false } })
    const { notification } = await supplierClient.waitFor((message) => message.type === 'notification')
    assert.equal(notification.type, 'message')
    assert.equal(notification.title, 'Nova mensagem de Festival Primavera Produções')
    const echoed = await organizerClient.waitFor((message) => message.type === 'message')
    assert.deepEqual(echoed.message, sent)
  })

  test('quem enviou fica sabendo quando o outro lado lê a conversa', async () => {
    const { organizer, supplier, proposal } = await createScenario()
    const organizerClient = await connectAs(organizer)
    await RequestGenerator.POST_proposal_message(proposal.proposal_key, { body: 'Leu?' }, organizer.headers)

    const [status] = await RequestGenerator.POST_proposal_messages_read(proposal.proposal_key, supplier.headers)

    assert.equal(status, 204)
    const read = await organizerClient.waitFor((message) => message.type === 'read')
    assert.deepEqual(read, { type: 'read', proposal_key: proposal.proposal_key })
  })

  test('quem lê a conversa recebe notifications_changed para atualizar o sininho', async () => {
    const { organizer, supplier, proposal } = await createScenario()
    const supplierClient = await connectAs(supplier)
    await RequestGenerator.POST_proposal_message(proposal.proposal_key, { body: 'Oi' }, organizer.headers)

    await RequestGenerator.POST_proposal_messages_read(proposal.proposal_key, supplier.headers)

    assert.deepEqual(await supplierClient.waitFor((message) => message.type === 'notifications_changed'), { type: 'notifications_changed' })
  })

  test('decisão de cadastro avisa os admins e bloqueio derruba o socket do usuário', async () => {
    const admin = await createUser('admin', 'Admin WebSocket')
    const otherAdmin = await createUser('admin', 'Outro Admin WebSocket')
    const pending = await createUser('fornecedor', 'Pendente WebSocket', 'pending')
    const otherAdminClient = await connectAs(otherAdmin)

    const [approveStatus] = await RequestGenerator.PUT_admin_user_status(pending.user.userKey, { status: 'approved' }, admin.headers)

    assert.equal(approveStatus, 202)
    assert.deepEqual(await otherAdminClient.waitFor((message) => message.type === 'notifications_changed'), {
      type: 'notifications_changed',
    })

    const supplierClient = await connectAs(pending)
    const [blockStatus] = await RequestGenerator.PUT_admin_user_status(
      pending.user.userKey,
      { status: 'blocked', reason: 'Teste de bloqueio com socket aberto' },
      admin.headers,
    )

    assert.equal(blockStatus, 202)
    assert.deepEqual(await supplierClient.closed, { code: 4403, reason: 'Forbidden' })
  })

  test('"digitando" chega só ao outro lado da conversa', async () => {
    const { organizer, supplier, proposal } = await createScenario()
    const outsider = await createUser('fornecedor')
    const supplierClient = await connectAs(supplier)
    const organizerClient = await connectAs(organizer)
    const outsiderClient = await connectAs(outsider)

    outsiderClient.send({ type: 'typing', proposal_key: proposal.proposal_key })
    supplierClient.send({ type: 'typing', proposal_key: proposal.proposal_key })

    assert.deepEqual(await organizerClient.waitFor((message) => message.type === 'typing'), {
      type: 'typing',
      proposal_key: proposal.proposal_key,
    })
    await sleep(200)
    assert.equal(supplierClient.received.filter((message) => message.type === 'typing').length, 0)
    assert.equal(organizerClient.received.filter((message) => message.type === 'typing').length, 1)
  })

  test('online da conversa acompanha a conexão do outro lado', async () => {
    const { organizer, supplier, proposal } = await createScenario()
    const organizerClient = await connectAs(organizer)

    const [, whileConnected] = await RequestGenerator.GET_proposal_messages(proposal.proposal_key, supplier.headers)
    await organizerClient.close()
    await sleep(100)
    const [, afterClosing] = await RequestGenerator.GET_proposal_messages(proposal.proposal_key, supplier.headers)

    assert.equal(whileConnected.counterpart.online, true)
    assert.equal(afterClosing.counterpart.online, false)
  })

  test('caminho diferente de /event_planning/ws não abre WebSocket', async () => {
    await assert.rejects(WebSocketClient.connect('/event_planning/outro'))
  })
})
