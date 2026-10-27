// Testes do PUT /event_planning/sample_entity/:key (troca de status) e do webhook.

import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { ObjectGenerator } from '../utils/object_generator.js'
import { PayloadGenerator } from '../utils/payload_generator.js'
import { RequestGenerator } from '../utils/request_generator.js'

describe('SampleEntityUpdate', () => {
  test('muda o status de pending para success', async () => {
    const sampleEntity = await ObjectGenerator.createSampleEntity()
    const key = sampleEntity.sample_entity_key

    const [updateStatus] = await RequestGenerator.PUT_sample_entity(key, { status: 'success' })
    assert.equal(updateStatus, 202)

    const [getStatus, updated] = await RequestGenerator.GET_sample_entity(key)
    assert.equal(getStatus, 200)
    assert.equal(updated.sample_entity_key, key)
    assert.equal(updated.status, 'success')
  })

  test('webhook soma 1 no contador', async () => {
    const sampleEntity = await ObjectGenerator.createSampleEntity()
    const key = sampleEntity.sample_entity_key

    const [webhookStatus] = await RequestGenerator.PUT_webhook_sample_entity(key)
    assert.equal(webhookStatus, 204)

    const [getStatus, updated] = await RequestGenerator.GET_sample_entity(key)
    assert.equal(getStatus, 200)
    assert.equal(updated.sample_entity_key, key)
    assert.equal(updated.counter, 1)
  })

  test('webhook com chave inexistente responde 404', async () => {
    const [status, response] = await RequestGenerator.PUT_webhook_sample_entity('00000000-0000-0000-0000-000000000000')
    assert.equal(status, 404)
    assert.equal(response.code, 'EVP000001')
  })

  test('entidade que já saiu de pending não muda mais de status (409)', async () => {
    const sampleEntity = await ObjectGenerator.createSampleEntity()
    const key = sampleEntity.sample_entity_key

    await ObjectGenerator.updateSampleEntity(key, 'success')

    const [getStatus, updated] = await RequestGenerator.GET_sample_entity(key)
    assert.equal(getStatus, 200)
    assert.equal(updated.status, 'success')

    const payload = PayloadGenerator.createNewStatusPayload('success')
    const [status, response] = await RequestGenerator.PUT_sample_entity(key, payload)
    assert.equal(status, 409)
    assert.equal(response.code, 'EVP000002')
  })

  test('status fora do schema responde 400', async () => {
    const sampleEntity = await ObjectGenerator.createSampleEntity()

    const [status, response] = await RequestGenerator.PUT_sample_entity(sampleEntity.sample_entity_key, { status: 'created' })
    assert.equal(status, 400)
    assert.equal(response.code, 'APP000001')
  })
})
