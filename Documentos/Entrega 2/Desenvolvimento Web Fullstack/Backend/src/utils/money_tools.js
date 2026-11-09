import { InvalidSchema } from '../errors/index.js'

// DECIMAL(12,2) arredondaria 0,001 para 0 e quebraria o CHECK de valor positivo; o texto evita o erro de ponto flutuante
const AT_MOST_TWO_DECIMALS = /^\d+(\.\d{1,2})?$/

export function ensureAtMostTwoDecimals(value, fieldName) {
  if (value === null || value === undefined) return

  if (!AT_MOST_TWO_DECIMALS.test(String(value))) {
    throw new InvalidSchema(
      `The ${fieldName} must have at most 2 decimal places.`,
      'Valores em dinheiro aceitam no máximo 2 casas decimais.',
    )
  }
}
