import { InvalidParameter } from '../errors/index.js'
import { getParam, getParamAsInt } from './request_params.js'

const SORT_FIELDS = ['start_date', 'name', 'status', 'created_at']
const MAX_PERIOD_DAYS = 366
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function parseAdminReportParams(req) {
  const eventKey = getParam(req, 'event_key')
  const organizerKey = getParam(req, 'organizer_key')
  const from = getParam(req, 'from')
  const to = getParam(req, 'to')

  validateUuid('event_key', eventKey)
  validateUuid('organizer_key', organizerKey)
  validateDateRange(from, to)

  const limit = getParamAsInt(req, 'limit', { minValue: 1, maxValue: 100, default: 20 })
  const page = getParamAsInt(req, 'page', {
    minValue: 0,
    maxValue: Math.floor(Number.MAX_SAFE_INTEGER / limit),
    default: 0,
  })
  const sort = getParam(req, 'sort') ?? 'start_date'
  const order = getParam(req, 'order') ?? 'desc'

  if (!SORT_FIELDS.includes(sort)) {
    throw new InvalidParameter(`The "sort" parameter is invalid. Allowed values: ${SORT_FIELDS.join(', ')}.`)
  }
  if (!['asc', 'desc'].includes(order)) {
    throw new InvalidParameter('The "order" parameter is invalid. Allowed values: asc, desc.')
  }

  return {
    eventKey: eventKey,
    organizerKey: organizerKey,
    from: from,
    to: to,
    limit: limit,
    page: page,
    offset: page * limit,
    sort: sort,
    order: order,
  }
}

function validateUuid(name, value) {
  if (value !== undefined && !UUID_PATTERN.test(value)) {
    throw new InvalidParameter(`The "${name}" parameter is invalid. The value must be a UUID.`)
  }
}

function validateDateRange(from, to) {
  if (from === undefined && to === undefined) {
    return
  }
  if (from === undefined || to === undefined) {
    throw new InvalidParameter('The "from" and "to" parameters must be informed together.')
  }

  const start = parseDate('from', from)
  const end = parseDate('to', to)
  const dayDifference = (end - start) / 86_400_000

  if (dayDifference < 0) {
    throw new InvalidParameter('The "from" parameter must be earlier than or equal to "to".')
  }
  if (dayDifference + 1 > MAX_PERIOD_DAYS) {
    throw new InvalidParameter(`The requested period must not exceed ${MAX_PERIOD_DAYS} days.`)
  }
}

function parseDate(name, value) {
  const datePattern = /^\d{4}-\d{2}-\d{2}$/
  const date = new Date(`${value}T00:00:00.000Z`)

  if (!datePattern.test(value) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new InvalidParameter(`The "${name}" parameter is invalid. Use a valid date in YYYY-MM-DD format.`)
  }

  return date
}
