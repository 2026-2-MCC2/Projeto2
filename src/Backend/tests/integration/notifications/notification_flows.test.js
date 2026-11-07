import assert from 'node:assert/strict'
import { afterEach, describe, test } from 'node:test'

import { DbUtils } from '../../utils/db_utils.js'
import { ObjectGenerator } from '../../utils/object_generator.js'
import { PayloadGenerator } from '../../utils/payload_generator.js'
import { RequestGenerator } from '../../utils/request_generator.js'
import { TokenGenerator } from '../../utils/token_generator.js'

const fixtureUserKeys = []

afterEach(async () => DbUtils.deleteUserFixtures(fixtureUserKeys.splice(0)))

const EVENT_NAME = PayloadGenerator.createEventPayload().name

// o fornecedor do DbUtils.createUserFixture atende Estrutura e Segurança
async function createUser(profile, name = 'Notificações Test User') {
  const user = await ObjectGenerator.createUserFixture({ profile, status: 'approved', name })
  fixtureUserKeys.push(user.userKey)
  return { user, headers: TokenGenerator.authorizationHeader(profile, { userKey: user.userKey }) }
}

async function getNotifications(headers, type) {
  const [status, response] = await RequestGenerator.GET_notifications({ limit: 100 }, headers)
  assert.equal(status, 200)
  return type === undefined ? response.data : response.data.filter((notification) => notification.type === type)
}

async function createScenario() {
  const organizer = await createUser('organizador')
  const supplier = await createUser('fornecedor', 'Palco Brasil')
  const { event, items } = await ObjectGenerator.createEventWithItems(organizer.headers, { categories: ['Estrutura', 'Segurança'] })
  return { organizer, supplier, event, items }
}

describe('Notificações nascidas nos fluxos', () => {
  test('proposta enviada avisa o organizador com fornecedor, item e valor', async () => {
    const { organizer, supplier, event, items } = await createScenario()

    const proposal = await ObjectGenerator.sendProposal(event.event_key, items[0].item_key, supplier.headers, { amount: 31800 })

    const notifications = await getNotifications(organizer.headers)
    assert.equal(notifications.length, 1)
    assert.equal(notifications[0].type, 'proposal_received')
    assert.equal(notifications[0].title, 'Nova proposta recebida')
    assert.equal(notifications[0].body, 'Palco Brasil · Estrutura do evento · R$ 31.800')
    assert.equal(notifications[0].link, `/organizador/eventos/${event.event_key}/propostas/${proposal.proposal_key}`)
    assert.equal(notifications[0].read, false)
    assert.equal((await getNotifications(supplier.headers, 'proposal_received')).length, 0)
  })

  test('proposta editada avisa o organizador', async () => {
    const { organizer, supplier, event, items } = await createScenario()
    const proposal = await ObjectGenerator.sendProposal(event.event_key, items[0].item_key, supplier.headers)

    const [status] = await RequestGenerator.PUT_supplier_proposal(
      proposal.proposal_key,
      PayloadGenerator.createSupplierProposalPayload({ amount: 1250.5 }),
      supplier.headers,
    )

    assert.equal(status, 200)
    const [updated] = await getNotifications(organizer.headers, 'proposal_updated')
    assert.equal(updated.title, 'Proposta atualizada')
    assert.equal(updated.body, 'Palco Brasil · Estrutura do evento · R$ 1.250,50')
    assert.equal(updated.link, `/organizador/eventos/${event.event_key}/propostas/${proposal.proposal_key}`)
  })

  test('proposta retirada avisa o organizador com link para as propostas do evento', async () => {
    const { organizer, supplier, event, items } = await createScenario()
    const proposal = await ObjectGenerator.sendProposal(event.event_key, items[0].item_key, supplier.headers)

    const [status] = await RequestGenerator.DELETE_supplier_proposal(proposal.proposal_key, supplier.headers)

    assert.equal(status, 204)
    const [withdrawn] = await getNotifications(organizer.headers, 'proposal_withdrawn')
    assert.equal(withdrawn.title, 'Proposta retirada')
    assert.equal(withdrawn.body, `Palco Brasil · Estrutura do evento · ${EVENT_NAME}`)
    assert.equal(withdrawn.link, `/organizador/eventos/${event.event_key}/propostas/${proposal.proposal_key}`)
  })

  test('aceite avisa o fornecedor escolhido e os recusados automaticamente, também na troca', async () => {
    const { organizer, supplier, event, items } = await createScenario()
    const otherSupplier = await createUser('fornecedor', 'Outro Palco')
    const first = await ObjectGenerator.sendProposal(event.event_key, items[0].item_key, supplier.headers)
    const second = await ObjectGenerator.sendProposal(event.event_key, items[0].item_key, otherSupplier.headers)

    await RequestGenerator.POST_event_proposal_accept(event.event_key, first.proposal_key, organizer.headers)

    const [accepted] = await getNotifications(supplier.headers, 'proposal_accepted')
    assert.equal(accepted.title, 'Proposta aceita')
    assert.equal(accepted.body, `Estrutura do evento · ${EVENT_NAME}`)
    assert.equal(accepted.link, `/fornecedor/propostas/${first.proposal_key}`)
    const [autoRejected] = await getNotifications(otherSupplier.headers, 'proposal_rejected')
    assert.equal(autoRejected.title, 'Proposta recusada')
    assert.equal(autoRejected.link, `/fornecedor/propostas/${second.proposal_key}`)

    const [swapStatus] = await RequestGenerator.POST_event_proposal_accept(event.event_key, second.proposal_key, organizer.headers)

    assert.equal(swapStatus, 200)
    assert.equal((await getNotifications(supplier.headers, 'proposal_rejected')).length, 1)
    assert.equal((await getNotifications(otherSupplier.headers, 'proposal_accepted')).length, 1)
    assert.equal((await getNotifications(otherSupplier.headers, 'proposal_rejected')).length, 1)
  })

  test('recusa avisa o fornecedor recusado', async () => {
    const { organizer, supplier, event, items } = await createScenario()
    const proposal = await ObjectGenerator.sendProposal(event.event_key, items[0].item_key, supplier.headers)

    const [status] = await RequestGenerator.POST_event_proposal_reject(event.event_key, proposal.proposal_key, organizer.headers)

    assert.equal(status, 200)
    const [rejected] = await getNotifications(supplier.headers, 'proposal_rejected')
    assert.equal(rejected.body, `Estrutura do evento · ${EVENT_NAME}`)
    assert.equal(rejected.link, `/fornecedor/propostas/${proposal.proposal_key}`)
  })

  test('cancelamento avisa só quem tinha proposta aberta ou aceita', async () => {
    const { organizer, supplier, event, items } = await createScenario()
    const rejectedSupplier = await createUser('fornecedor', 'Recusado')
    const openSupplier = await createUser('fornecedor', 'Em aberto')
    const accepted = await ObjectGenerator.sendProposal(event.event_key, items[0].item_key, supplier.headers)
    await ObjectGenerator.sendProposal(event.event_key, items[0].item_key, rejectedSupplier.headers)
    const open = await ObjectGenerator.sendProposal(event.event_key, items[1].item_key, openSupplier.headers)
    await RequestGenerator.POST_event_proposal_accept(event.event_key, accepted.proposal_key, organizer.headers)

    const [status] = await RequestGenerator.PATCH_event_status(event.event_key, { status: 'canceled', reason: 'Chuva' }, organizer.headers)

    assert.equal(status, 200)
    const [acceptedCanceled] = await getNotifications(supplier.headers, 'event_canceled')
    assert.equal(acceptedCanceled.title, 'Evento cancelado')
    assert.equal(acceptedCanceled.body, `${EVENT_NAME} · Estrutura do evento`)
    assert.equal(acceptedCanceled.link, `/fornecedor/propostas/${accepted.proposal_key}`)
    const [openCanceled] = await getNotifications(openSupplier.headers, 'event_canceled')
    assert.equal(openCanceled.link, `/fornecedor/propostas/${open.proposal_key}`)
    assert.equal((await getNotifications(rejectedSupplier.headers, 'event_canceled')).length, 0)
  })

  test('publicação avisa só os fornecedores aprovados que atendem alguma categoria do evento', async () => {
    const organizer = await createUser('organizador')
    const foodSupplier = await createUser('fornecedor', 'Sabor & Arte')
    const [categoriesStatus] = await RequestGenerator.PUT_me_categorias({ categories: ['Alimentação', 'Bebidas'] }, foodSupplier.headers)
    assert.equal(categoriesStatus, 200)
    const structureSupplier = await createUser('fornecedor', 'Palco Brasil')
    const blockedSupplier = await createUser('fornecedor', 'Bloqueado')
    await DbUtils.setUserStatus(blockedSupplier.user.userKey, 'blocked')

    const { event } = await ObjectGenerator.createEventWithItems(organizer.headers, {
      categories: ['Alimentação', 'Bebidas', 'Comunicação'],
    })

    const [published] = await getNotifications(foodSupplier.headers, 'event_published')
    assert.equal(published.title, 'Novo evento na sua categoria')
    assert.equal(published.body, `${EVENT_NAME} · 2 itens em Alimentação e Bebidas`)
    assert.equal(published.link, `/fornecedor/eventos/${event.event_key}`)
    assert.equal((await getNotifications(structureSupplier.headers)).length, 0)
    await DbUtils.setUserStatus(blockedSupplier.user.userKey, 'approved')
    assert.equal((await getNotifications(blockedSupplier.headers)).length, 0)
    assert.equal((await getNotifications(organizer.headers)).length, 0)
  })

  test('publicação com um item conta no singular', async () => {
    const organizer = await createUser('organizador')
    const supplier = await createUser('fornecedor')

    const { event } = await ObjectGenerator.createEventWithItems(organizer.headers, { categories: ['Segurança'] })

    const [published] = await getNotifications(supplier.headers, 'event_published')
    assert.equal(published.body, `${EVENT_NAME} · 1 item em Segurança`)
    assert.equal(published.link, `/fornecedor/eventos/${event.event_key}`)
  })
})

describe('Notificações do admin', () => {
  test('cadastro novo avisa os admins e a decisão de qualquer admin marca como lida para todos', async () => {
    const admin = await createUser('admin', 'Admin Notificações')
    const otherAdmin = await createUser('admin', 'Outro Admin')
    const payload = PayloadGenerator.createOrganizerRegistrationPayload({ name: 'Eventos Aurora' })

    const [status, registered] = await RequestGenerator.POST_auth_cadastro(payload)
    fixtureUserKeys.push(registered.user_key)
    assert.equal(status, 201)

    const link = `/admin/aprovacoes?cadastro=${registered.user_key}`
    for (const { headers } of [admin, otherAdmin]) {
      const pending = (await getNotifications(headers, 'user_pending')).filter((notification) => notification.link === link)
      assert.equal(pending.length, 1)
      assert.equal(pending[0].title, 'Novo cadastro para aprovar')
      assert.equal(pending[0].body, 'Eventos Aurora · Organizador')
      assert.equal(pending[0].read, false)
    }

    const [decisionStatus] = await RequestGenerator.PUT_admin_user_status(registered.user_key, { status: 'approved' }, admin.headers)
    assert.equal(decisionStatus, 202)

    const [stillPending] = (await getNotifications(otherAdmin.headers, 'user_pending')).filter((notification) => notification.link === link)
    assert.equal(stillPending.read, true)
  })
})
