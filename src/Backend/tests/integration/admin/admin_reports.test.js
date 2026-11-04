import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { afterEach, describe, test } from 'node:test'
import mysql from 'mysql2/promise'

import { DbUtils } from '../../utils/db_utils.js'
import { LOCAL_DATABASE_URL } from '../../utils/local_secrets.js'
import { ObjectGenerator } from '../../utils/object_generator.js'
import { RequestGenerator } from '../../utils/request_generator.js'
import { TokenGenerator } from '../../utils/token_generator.js'

const fixtureUserKeys = []
const fixtureEventKeys = []

afterEach(async () => {
  await deleteReportEventFixtures(fixtureEventKeys.splice(0))
  await DbUtils.deleteUserFixtures(fixtureUserKeys.splice(0))
})

async function createFixture(options) {
  const user = await ObjectGenerator.createUserFixture(options)
  fixtureUserKeys.push(user.userKey)
  return user
}

function headersFor(user) {
  return TokenGenerator.authorizationHeader(user.profile, { userKey: user.userKey })
}

describe('GET /admin/reports', () => {
  test('admin recebe o contrato consolidado e os metadados da paginação', async () => {
    const admin = await createFixture({ profile: 'admin', status: 'approved' })

    const [status, report] = await RequestGenerator.GET_admin_reports({ limit: 5, page: 0 }, headersFor(admin))

    assert.equal(status, 200)
    assert.deepEqual(Object.keys(report).sort(), ['data', 'is_last_page', 'limit', 'page', 'summary'])
    assert.deepEqual(Object.keys(report.summary).sort(), ['event_statuses', 'proposal_statuses', 'registration_statuses', 'values'])
    assert.deepEqual(Object.keys(report.summary.values).sort(), [
      'estimated_items_total',
      'internal_cost_total',
      'selected_proposals_total',
    ])
    assert.equal(report.limit, 5)
    assert.equal(report.page, 0)
    assert.ok(Array.isArray(report.data))
  })

  test('filtra evento, organizador e período e consolida estimativas, custos, propostas e tickets', async () => {
    const admin = await createFixture({ profile: 'admin', status: 'approved' })
    const organizer = await createFixture({ profile: 'organizador', status: 'approved' })
    const supplier = await createFixture({ profile: 'fornecedor', status: 'approved' })
    await renameFixtureUser(organizer.userKey, 'Organizadora RF14')
    const eventKey = await createReportEventFixture(organizer.userKey, supplier.userKey)
    fixtureEventKeys.push(eventKey)

    const [status, report] = await RequestGenerator.GET_admin_reports(
      {
        event_name: 'Festival RF14',
        organizer_name: 'Organizadora RF14',
        from: '2026-10-15',
        to: '2026-10-15',
      },
      headersFor(admin),
    )

    assert.equal(status, 200)
    assert.equal(report.data.length, 1)
    assert.equal(report.data[0].event_key, eventKey)
    assert.equal(report.data[0].proposal_count, 1)
    assert.deepEqual(report.data[0].values, {
      estimated_items_total: '200.00',
      internal_cost_total: '30.00',
      selected_proposals_total: '120.00',
      planning_cost_total: '120.00',
    })
    assert.deepEqual(report.data[0].estimated_ticket, {
      minimum: '0.38',
      expected: '0.19',
      maximum: '0.09',
    })
    assert.equal(report.summary.values.estimated_items_total, '200.00')
    assert.equal(report.summary.values.internal_cost_total, '30.00')
    assert.equal(report.summary.values.selected_proposals_total, '120.00')
  })

  test('organizador e fornecedor aprovados recebem 403', async () => {
    for (const profile of ['organizador', 'fornecedor']) {
      const user = await createFixture({ profile: profile, status: 'approved' })
      const [status, response] = await RequestGenerator.GET_admin_reports({}, headersFor(user))

      assert.equal(status, 403)
      assert.equal(response.code, 'APP000403')
    }
  })

  test('sem token recebe 401 e parâmetro inválido recebe 400 para admin', async () => {
    const [unauthorizedStatus, unauthorizedResponse] = await RequestGenerator.GET_admin_reports()
    assert.equal(unauthorizedStatus, 401)
    assert.equal(unauthorizedResponse.code, 'APP000401')

    const admin = await createFixture({ profile: 'admin', status: 'approved' })
    const [invalidStatus, invalidResponse] = await RequestGenerator.GET_admin_reports({ from: '2026-01-01' }, headersFor(admin))
    assert.equal(invalidStatus, 400)
    assert.equal(invalidResponse.code, 'APP000010')
  })
})

async function renameFixtureUser(userKey, name) {
  const connection = await mysql.createConnection(LOCAL_DATABASE_URL)
  try {
    await connection.execute('UPDATE user SET name = ? WHERE user_key = ?', [name, userKey])
  } finally {
    await connection.end()
  }
}

async function createReportEventFixture(organizerUserKey, supplierUserKey) {
  const eventKey = randomUUID()
  const connection = await mysql.createConnection(LOCAL_DATABASE_URL)

  try {
    await connection.beginTransaction()
    const [[organizer]] = await connection.execute(
      `SELECT organizer.id FROM organizer
       INNER JOIN user ON user.id = organizer.user_id
       WHERE user.user_key = ?`,
      [organizerUserKey],
    )
    const [[supplier]] = await connection.execute(
      `SELECT supplier.id FROM supplier
       INNER JOIN user ON user.id = supplier.user_id
       WHERE user.user_key = ?`,
      [supplierUserKey],
    )

    await connection.execute(
      `INSERT INTO event (
         event_key, organizer_id, name, category, venue_name, address, city, state,
         start_date, end_date, min_audience, expected_audience, max_audience,
         profit_margin, reference_scenario, status
       ) VALUES (?, ?, ?, 'Música', 'Espaço RF14', 'Rua RF14', 'São Paulo', 'SP',
                 '2026-10-15 18:00:00', '2026-10-16 02:00:00', 500, 1000, 2000,
                 0.2000, 'expected', 'open_for_quotes')`,
      [eventKey, organizer.id, 'Festival RF14'],
    )
    const [budgetItem] = await connection.execute(
      `INSERT INTO budget_item (budget_item_key, event_id, category_id, description, type, quantity, estimated_value)
       VALUES (?, (SELECT id FROM event WHERE event_key = ?),
               (SELECT id FROM item_category ORDER BY id LIMIT 1), 'Som RF14', 'service', 2, 100.00)`,
      [randomUUID(), eventKey],
    )
    await connection.execute(
      `INSERT INTO proposal (
         proposal_key, budget_item_id, supplier_id, amount, description, delivery_terms,
         payment_terms, valid_until, status, selected
       ) VALUES (?, ?, ?, 120.00, 'Proposta RF14', 'Entrega no evento', 'À vista',
                 '2026-11-30', 'accepted', FALSE)`,
      [randomUUID(), budgetItem.insertId, supplier.id],
    )
    await connection.execute(
      `INSERT INTO internal_cost (internal_cost_key, event_id, type, description, amount)
       SELECT ?, id, 'operational', 'Custo interno RF14', 30.00 FROM event WHERE event_key = ?`,
      [randomUUID(), eventKey],
    )
    await connection.commit()
    return eventKey
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    await connection.end()
  }
}

async function deleteReportEventFixtures(eventKeys) {
  if (eventKeys.length === 0) return

  const connection = await mysql.createConnection(LOCAL_DATABASE_URL)
  try {
    const placeholders = eventKeys.map(() => '?').join(', ')
    await connection.execute(`DELETE FROM event WHERE event_key IN (${placeholders})`, eventKeys)
  } finally {
    await connection.end()
  }
}
