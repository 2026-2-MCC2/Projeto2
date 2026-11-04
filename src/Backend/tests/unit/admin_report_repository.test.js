import assert from 'node:assert/strict'
import { afterEach, describe, test } from 'node:test'

import { AdminReportRepository } from '../../src/repositories/admin_report_repository.js'
import { sequelize } from '../../src/connectors/database_connector.js'

const originalQuery = sequelize.query

afterEach(() => {
  sequelize.query = originalQuery
})

describe('AdminReportRepository', () => {
  test('consulta resumos e eventos em agregações separadas e pagina buscando uma linha extra', async () => {
    const queries = []
    sequelize.query = async (sql, options = {}) => {
      queries.push({ sql: sql, options: options })

      if (sql.includes('FROM user')) return [{ profile: 'organizador', status: 'approved', total: '2' }]
      if (sql.includes('GROUP BY e.status')) return [{ status: 'draft', total: '3' }]
      if (sql.includes('GROUP BY proposal.status')) return [{ status: 'sent', total: '4' }]
      if (sql.includes('SELECT e.event_key')) {
        return [
          { event_key: 'evento-1', name: 'A' },
          { event_key: 'evento-2', name: 'B' },
        ]
      }
      if (sql.includes('AS selected_proposals_total')) {
        return [{ estimated_items_total: '100.00', internal_cost_total: '20.00', selected_proposals_total: '75.00' }]
      }

      assert.fail(`Consulta inesperada: ${sql}`)
    }

    const repository = new AdminReportRepository({ dbSession: {} })
    const report = await repository.getReportPage({
      eventKey: undefined,
      organizerKey: '22222222-2222-4222-8222-222222222222',
      eventName: 'Festival',
      organizerName: 'Grupo Cultura',
      from: '2026-01-01',
      to: '2026-01-31',
      limit: 1,
      page: 0,
      offset: 0,
      sort: 'name',
      order: 'asc',
    })

    assert.equal(queries.length, 5)
    assert.deepEqual(report.registrationStatuses, [{ profile: 'organizador', status: 'approved', total: '2' }])
    assert.deepEqual(report.eventStatuses, [{ status: 'draft', total: '3' }])
    assert.deepEqual(report.proposalStatuses, [{ status: 'sent', total: '4' }])
    assert.deepEqual(report.totals, {
      estimated_items_total: '100.00',
      internal_cost_total: '20.00',
      selected_proposals_total: '75.00',
    })
    assert.deepEqual(report.events, [{ event_key: 'evento-1', name: 'A' }])
    assert.equal(report.isLastPage, false)

    const eventQuery = queries.find(({ sql }) => sql.includes('SELECT e.event_key'))
    assert.match(eventQuery.sql, /ORDER BY e\.name ASC, e\.id ASC/)
    assert.match(eventQuery.sql, /estimated_items_total[\s\S]*internal_cost_total[\s\S]*selected_total[\s\S]*planning_cost_total/)
    assert.equal(eventQuery.options.replacements.rowLimit, 2)
    assert.equal(eventQuery.options.replacements.organizerKey, '22222222-2222-4222-8222-222222222222')
    assert.equal(eventQuery.options.replacements.eventName, 'Festival')
    assert.equal(eventQuery.options.replacements.organizerName, 'Grupo Cultura')
    assert.match(eventQuery.sql, /LOCATE\(LOWER\(:eventName\), LOWER\(e\.name\)\)/)
    assert.equal(eventQuery.options.replacements.fromDate, '2026-01-01 00:00:00')
    assert.equal(eventQuery.options.replacements.toExclusive, '2026-02-01 00:00:00')
  })
})
