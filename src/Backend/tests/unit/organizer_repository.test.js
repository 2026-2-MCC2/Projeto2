// Testes unitários do repository de organizador sem abrir conexão com o banco.

import assert from 'node:assert/strict'
import { afterEach, describe, test } from 'node:test'

import { Organizer } from '../../src/models/index.js'
import { OrganizerRepository } from '../../src/repositories/organizer_repository.js'

const originalFindOne = Organizer.findOne
const originalCreate = Organizer.create

afterEach(() => {
  Organizer.findOne = originalFindOne
  Organizer.create = originalCreate
})

function createContext() {
  return { dbSession: { LOCK: { UPDATE: Symbol('UPDATE') } } }
}

describe('OrganizerRepository', () => {
  test('busca o organizador pelo CNPJ dentro da transação', async () => {
    const context = createContext()
    const organizer = { id: 7, cnpj: '12345678000195' }
    let queryOptions
    Organizer.findOne = async (options) => {
      queryOptions = options
      return organizer
    }

    const repository = new OrganizerRepository(context)
    const result = await repository.getByCnpj('12345678000195')

    assert.equal(result, organizer)
    assert.deepEqual(queryOptions.where, { cnpj: '12345678000195' })
    assert.equal(queryOptions.transaction, context.dbSession)
  })

  test('devolve null quando o CNPJ não existe', async () => {
    Organizer.findOne = async () => null

    const repository = new OrganizerRepository(createContext())
    const result = await repository.getByCnpj('00000000000000')

    assert.equal(result, null)
  })

  test('cria o organizador ligado ao usuário dentro da transação', async () => {
    const context = createContext()
    const createdOrganizer = { id: 7 }
    let createValues
    let createOptions
    Organizer.create = async (values, options) => {
      createValues = values
      createOptions = options
      return createdOrganizer
    }

    const repository = new OrganizerRepository(context)
    const result = await repository.create({ userId: 15, cnpj: '12345678000195', phone: '11999998888' })

    assert.equal(result, createdOrganizer)
    assert.deepEqual(createValues, { user_id: 15, cnpj: '12345678000195', phone: '11999998888' })
    assert.equal(createOptions.transaction, context.dbSession)
  })
})
