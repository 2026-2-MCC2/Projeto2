// Valida o body da requisição com um arquivo JSON Schema da pasta src/schemas/.
//
// JSON SCHEMA
// É um arquivo JSON que descreve o formato que outro JSON deve ter. Exemplo (post_sample_entity.json):
//   {
//     "type": "object",
//     "properties": { "hello": { "type": "string", "minLength": 1, "maxLength": 255 } },
//     "required": ["hello"],              <- campos obrigatórios
//     "additionalProperties": false       <- recusa campos que não estão em "properties"
//   }
// Aceita:  { "hello": "world" }
// Recusa:  {}  ->  400 "must have required property 'hello'"
// Referência das regras: https://json-schema.org/understanding-json-schema
//
// Uso, na primeira linha do método do resource:
//   SchemaHandler.validate(req, 'post_sample_entity.json')
// Se o body não seguir o schema, responde 400 (code APP000001) e o resource nem continua.

import { readFileSync } from 'node:fs'

import Ajv from 'ajv'

import { SCHEMA_PATH } from '../constants.js'
import { InvalidSchema } from '../errors/index.js'

// Ajv é a biblioteca que faz a validação
const ajv = new Ajv()

// guarda os schemas já lidos, para não ler o arquivo de novo a cada requisição
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

    // mostra o primeiro problema encontrado, com o campo onde ele está
    // (o Ajv indica o campo como "/hello"; trocamos para "hello")
    const error = validateSchema.errors[0]
    const errorPath = error.instancePath.slice(1).replaceAll('/', '.')

    let errorMessage = error.message
    if (errorPath !== '') {
      errorMessage = `${error.message} in ${errorPath}`
    }
    throw new InvalidSchema(errorMessage)
  }
}
