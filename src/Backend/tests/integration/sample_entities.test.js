// Testes do GET /event_planning/sample_entities (listagem com paginação e filtro).
// Começam com DbUtils.rollback() porque contam itens e precisam do banco vazio.

import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { DbUtils } from '../utils/db_utils.js'
import { ObjectGenerator } from '../utils/object_generator.js'
import { RequestGenerator } from '../utils/request_generator.js'

describe('SampleEntities', () => {
  test('pagina a listagem', async () => {
    await DbUtils.rollback()
    await ObjectGenerator.createSampleEntity()
    await ObjectGenerator.createSampleEntity()
    await ObjectGenerator.createSampleEntity()

    // sem parâmetros: as 3 cabem na página padrão (limit 10)
    const [allStatus, allPage] = await RequestGenerator.GET_sample_entities()
    assert.equal(allStatus, 200)
    assert.equal(allPage.data.length, 3)
    assert.equal(allPage.is_last_page, true)

    // 2 por página: a primeira página tem 2 e existe uma próxima
    const [firstStatus, firstPage] = await RequestGenerator.GET_sample_entities({ limit: 2 })
    assert.equal(firstStatus, 200)
    assert.equal(firstPage.data.length, 2)
    assert.equal(firstPage.is_last_page, false)

    // a segunda página (page começa em 0) tem a que sobrou
    const [secondStatus, secondPage] = await RequestGenerator.GET_sample_entities({ limit: 2, page: 1 })
    assert.equal(secondStatus, 200)
    assert.equal(secondPage.data.length, 1)
    assert.equal(secondPage.is_last_page, true)
  })

  test('filtra por status', async () => {
    await DbUtils.rollback()
    const first = await ObjectGenerator.createSampleEntity()
    await ObjectGenerator.createSampleEntity()
    await ObjectGenerator.createSampleEntity()

    await ObjectGenerator.updateSampleEntity(first.sample_entity_key, 'success')

    const [successStatus, successPage] = await RequestGenerator.GET_sample_entities({ status: 'success' })
    assert.equal(successStatus, 200)
    assert.equal(successPage.data.length, 1)
    assert.equal(successPage.is_last_page, true)
    assert.equal(successPage.data[0].sample_entity_key, first.sample_entity_key)

    const [pendingStatus, pendingPage] = await RequestGenerator.GET_sample_entities({ status: 'pending' })
    assert.equal(pendingStatus, 200)
    assert.equal(pendingPage.data.length, 2)
    assert.equal(pendingPage.is_last_page, true)
  })

  test('parâmetros inválidos respondem 400', async () => {
    const [negativePageStatus, negativePage] = await RequestGenerator.GET_sample_entities({ page: -3 })
    assert.equal(negativePageStatus, 400)
    assert.equal(negativePage.code, 'APP000010')

    const [bigLimitStatus, bigLimit] = await RequestGenerator.GET_sample_entities({ limit: 101 })
    assert.equal(bigLimitStatus, 400)
    assert.equal(bigLimit.code, 'APP000010')

    const [unknownStatusStatus, unknownStatus] = await RequestGenerator.GET_sample_entities({ status: 'unknown' })
    assert.equal(unknownStatusStatus, 400)
    assert.equal(unknownStatus.code, 'APP000010')
  })
})
