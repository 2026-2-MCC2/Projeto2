// Cria dados na API para usar como ponto de partida de um teste, já conferindo que deu certo.
// Exemplo: um teste de update precisa de uma entidade existente:
//   const sampleEntity = await ObjectGenerator.createSampleEntity()
//   const key = sampleEntity.sample_entity_key

import assert from 'node:assert/strict'

import { PayloadGenerator } from './payload_generator.js'
import { RequestGenerator } from './request_generator.js'

export class ObjectGenerator {
  static async createSampleEntity(hello) {
    const sampleEntityPayload = PayloadGenerator.createSampleEntityPayload(hello)

    const [status, response] = await RequestGenerator.POST_sample_entity(sampleEntityPayload)
    assert.equal(status, 201)

    return response
  }

  static async updateSampleEntity(sampleEntityKey, newStatus) {
    const sampleEntityPayload = PayloadGenerator.createNewStatusPayload(newStatus)

    const [status, response] = await RequestGenerator.PUT_sample_entity(sampleEntityKey, sampleEntityPayload)
    assert.equal(status, 202)

    return response
  }
}
