import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { parseAdminReportParams } from '../../src/utils/admin_report_params.js'

const EVENT_KEY = '11111111-1111-4111-8111-111111111111'
const ORGANIZER_KEY = '22222222-2222-4222-8222-222222222222'

function request(query = {}) {
  return { query: query }
}

describe('parseAdminReportParams', () => {
  test('usa paginação e ordenação padrão', () => {
    assert.deepEqual(parseAdminReportParams(request()), {
      eventKey: undefined,
      organizerKey: undefined,
      from: undefined,
      to: undefined,
      limit: 20,
      page: 0,
      offset: 0,
      sort: 'start_date',
      order: 'desc',
    })
  })

  test('lê filtros de chaves, período, paginação e ordenação', () => {
    assert.deepEqual(
      parseAdminReportParams(
        request({
          event_key: EVENT_KEY,
          organizer_key: ORGANIZER_KEY,
          from: '2026-01-01',
          to: '2026-12-31',
          limit: '50',
          page: '2',
          sort: 'name',
          order: 'asc',
        }),
      ),
      {
        eventKey: EVENT_KEY,
        organizerKey: ORGANIZER_KEY,
        from: '2026-01-01',
        to: '2026-12-31',
        limit: 50,
        page: 2,
        offset: 100,
        sort: 'name',
        order: 'asc',
      },
    )
  })

  test('rejeita filtros repetidos', () => {
    assert.throws(() => parseAdminReportParams(request({ event_key: [EVENT_KEY, EVENT_KEY] })))
  })

  test('rejeita chaves que não são UUID', () => {
    assert.throws(() => parseAdminReportParams(request({ organizer_key: 'organizador-1' })))
  })

  test('rejeita datas inexistentes e formatos diferentes de YYYY-MM-DD', () => {
    assert.throws(() => parseAdminReportParams(request({ from: '2026-02-30', to: '2026-03-01' })))
    assert.throws(() => parseAdminReportParams(request({ from: '01/01/2026', to: '2026-01-02' })))
  })

  test('exige from e to juntos', () => {
    assert.throws(() => parseAdminReportParams(request({ from: '2026-01-01' })))
  })

  test('rejeita intervalo invertido ou maior que 366 dias inclusivos', () => {
    assert.throws(() => parseAdminReportParams(request({ from: '2026-01-02', to: '2026-01-01' })))
    assert.throws(() => parseAdminReportParams(request({ from: '2025-01-01', to: '2026-01-02' })))
  })

  test('aceita o limite de 366 dias inclusivos', () => {
    assert.equal(
      parseAdminReportParams(request({ from: '2025-01-01', to: '2026-01-01' })).to,
      '2026-01-01',
    )
  })

  test('valida limites da paginação', () => {
    assert.throws(() => parseAdminReportParams(request({ limit: '0' })))
    assert.throws(() => parseAdminReportParams(request({ limit: '101' })))
    assert.throws(() => parseAdminReportParams(request({ page: '-1' })))
  })

  test('aceita somente campos e direções de ordenação permitidos', () => {
    assert.throws(() => parseAdminReportParams(request({ sort: 'email' })))
    assert.throws(() => parseAdminReportParams(request({ order: 'sideways' })))
  })
})
