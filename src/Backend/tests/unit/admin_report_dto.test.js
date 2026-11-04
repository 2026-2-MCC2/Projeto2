import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { AdminReportDTO } from '../../src/dtos/admin_report_dto.js'

function event(overrides = {}) {
  return {
    event_key: '11111111-1111-4111-8111-111111111111',
    name: 'Festival',
    start_date: '2026-10-01 18:00:00',
    end_date: '2026-10-02 02:00:00',
    status: 'open_for_quotes',
    organizer_key: '22222222-2222-4222-8222-222222222222',
    organizer_name: 'Grupo Cultura',
    min_audience: 4000,
    expected_audience: 5000,
    max_audience: 6000,
    profit_margin: '0.2000',
    reference_scenario: 'expected',
    proposal_count: 3,
    sent_proposal_count: 2,
    review_proposal_count: 0,
    accepted_proposal_count: 1,
    rejected_proposal_count: 0,
    estimated_items_total: '95000.00',
    internal_cost_total: '10000.00',
    selected_proposals_total: '90000.00',
    planning_cost_total: '90000.00',
    incomplete_budget_item_count: 0,
    ...overrides,
  }
}

describe('AdminReportDTO', () => {
  test('calcula ticket para os públicos mínimo, esperado e máximo', () => {
    const reportEvent = AdminReportDTO.event(event())

    assert.deepEqual(reportEvent.estimated_ticket, {
      minimum: '31.25',
      expected: '25.00',
      maximum: '20.83',
    })
    assert.equal(reportEvent.values.planning_cost_total, '90000.00')
  })

  test('não calcula ticket quando falta estimativa para item sem proposta selecionada', () => {
    const reportEvent = AdminReportDTO.event(event({ incomplete_budget_item_count: 1 }))

    assert.equal(reportEvent.estimated_ticket, null)
  })
})
