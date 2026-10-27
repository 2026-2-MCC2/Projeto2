// Lê parâmetros da query string (o que vem depois do "?" na URL) já validando.
// Se o valor for inválido, responde 400 com code APP000010.
//
// Exemplos, para a URL /event_planning/sample_entities?limit=20&status=pending
//   getParamAsInt(req, 'limit', { minValue: 0, maxValue: 100, default: 10 })   20
//   getParamAsInt(req, 'page', { minValue: 0, default: 0 })                    0 (não veio, usa o default)
//   getParam(req, 'status')                                                    'pending'
//   getParam(req, 'nome')                                                      undefined (não veio)
//
//   ?limit=abc  -> 400 'The "limit" parameter is invalid. The value must be an integer.'
//   ?limit=500  -> 400 'The "limit" parameter is invalid. The value must be at most 100.'

import { InvalidParameter } from '../errors/index.js'

export function getParam(req, name) {
  const value = req.query[name]

  // ?status=a&status=b chega como lista; aqui só aceitamos um valor
  if (Array.isArray(value)) {
    throw new InvalidParameter(`The "${name}" parameter is invalid. Only one value is allowed.`)
  }
  if (value === '') {
    return undefined
  }
  return value
}

export function getParamAsInt(req, name, { minValue, maxValue, default: defaultValue } = {}) {
  const rawValue = getParam(req, name)
  if (rawValue === undefined) {
    return defaultValue
  }

  const value = Number(rawValue)
  if (!Number.isInteger(value)) {
    throw new InvalidParameter(`The "${name}" parameter is invalid. The value must be an integer.`)
  }
  if (minValue !== undefined && value < minValue) {
    throw new InvalidParameter(`The "${name}" parameter is invalid. The value must be at least ${minValue}.`)
  }
  if (maxValue !== undefined && value > maxValue) {
    throw new InvalidParameter(`The "${name}" parameter is invalid. The value must be at most ${maxValue}.`)
  }

  return value
}
