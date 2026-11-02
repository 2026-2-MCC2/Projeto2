import assert from 'node:assert/strict'
import { afterEach, describe, test } from 'node:test'

import { DbUtils } from '../../utils/db_utils.js'
import { ObjectGenerator } from '../../utils/object_generator.js'
import { RequestGenerator } from '../../utils/request_generator.js'
import { TokenGenerator } from '../../utils/token_generator.js'

const fixtureUserKeys = []

afterEach(async () => {
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
