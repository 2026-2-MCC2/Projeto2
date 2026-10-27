// Junta todos os erros. Em outros arquivos, importe daqui:
//   import { NotFoundResource } from '../errors/index.js'

import * as baseErrors from './base_error.js'
import * as customErrors from './custom_errors.js'

export * from './base_error.js'
export * from './custom_errors.js'
export * from './api_error_handler.js'

// Chamada no server.js: se dois erros usarem o mesmo código, a aplicação não sobe.
export function errorVerification() {
  const allErrorClasses = [...Object.values(baseErrors), ...Object.values(customErrors)]
  const usedCodes = {}

  for (const errorClass of allErrorClasses) {
    const isCustomException = errorClass.prototype instanceof baseErrors.ApiException
    if (!isCustomException) {
      continue
    }

    const usedClassName = usedCodes[errorClass.code]
    if (usedClassName !== undefined) {
      throw new Error(`The code ${errorClass.code} is being used twice: In ${errorClass.name} and ${usedClassName}`)
    }
    usedCodes[errorClass.code] = errorClass.name
  }
}
