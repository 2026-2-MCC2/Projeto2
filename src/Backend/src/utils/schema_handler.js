import { readFileSync } from 'node:fs'

import Ajv from 'ajv'

import { SCHEMA_PATH } from '../constants.js'
import { InvalidSchema } from '../errors/index.js'

const ajv = new Ajv()

class SchemaCache {
  static schemas = {}

  static getSchema(schemaFileName) {
    if (SchemaCache.schemas[schemaFileName] === undefined) {
      const schemaJson = JSON.parse(readFileSync(SCHEMA_PATH + schemaFileName, 'utf8'))
      SchemaCache.schemas[schemaFileName] = ajv.compile(schemaJson)
    }
    return SchemaCache.schemas[schemaFileName]
  }
}

export class SchemaHandler {
  static validate(req, schemaFileName) {
    const validateSchema = SchemaCache.getSchema(schemaFileName)

    const isValid = validateSchema(req.context.media)
    if (isValid) {
      return
    }

    // o ajv indica o campo como "/a/b"; a mensagem usa "a.b"
    const error = validateSchema.errors[0]
    const errorPath = error.instancePath.slice(1).replaceAll('/', '.')

    let errorMessage = error.message
    if (errorPath !== '') {
      errorMessage = `${error.message} in ${errorPath}`
    }
    throw new InvalidSchema(errorMessage)
  }
}
