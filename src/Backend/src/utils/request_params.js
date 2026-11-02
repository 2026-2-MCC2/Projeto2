import { InvalidParameter } from '../errors/index.js'

export function getParam(req, name) {
  const value = req.query[name]

  // ?status=a&status=b chega como lista
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
