// Testes do POST /event_planning/sample_entity e do GET /event_planning/sample_entity/:key

import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { RequestGenerator } from '../utils/request_generator.js'

describe('SampleEntityCreate', () => {
  test('body fora do schema responde 400', async () => {
    const [emptyStatus, emptyResponse] = await RequestGenerator.POST_sample_entity({})
    assert.equal(emptyStatus, 400)
    assert.equal(emptyResponse.code, 'APP000001')

    const [extraFieldStatus, extraFieldResponse] = await RequestGenerator.POST_sample_entity({ hello: 'world', extra: true })
    assert.equal(extraFieldStatus, 400)
    assert.equal(extraFieldResponse.code, 'APP000001')
  })

  test('cria a entidade com status pending', async () => {
    const [createStatus, created] = await RequestGenerator.POST_sample_entity({ hello: 'world' })
    assert.equal(createStatus, 201)

    const key = created.sample_entity_key

    const [getStatus, sampleEntity] = await RequestGenerator.GET_sample_entity(key)
    assert.equal(getStatus, 200)
    assert.equal(sampleEntity.sample_entity_key, key)
    assert.equal(sampleEntity.status, 'pending')
    assert.equal(sampleEntity.hello, 'world')
    assert.equal(sampleEntity.counter, 0)
  })

  test('chave inexistente responde 404', async () => {
    const [status, response] = await RequestGenerator.GET_sample_entity('00000000-0000-0000-0000-000000000000')
    assert.equal(status, 404)
    assert.equal(response.code, 'EVP000001')
  })
})
