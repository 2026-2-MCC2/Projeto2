// Testes unitários do repository de fornecedor sem abrir conexão com o banco.

import assert from 'node:assert/strict'
import { afterEach, describe, test } from 'node:test'

import { Supplier } from '../../src/models/index.js'
import { SupplierRepository } from '../../src/repositories/supplier_repository.js'

const originalFindOne = Supplier.findOne
const originalCreate = Supplier.create

afterEach(() => {
  Supplier.findOne = originalFindOne
  Supplier.create = originalCreate
})

function createContext() {
  return { dbSession: { LOCK: { UPDATE: Symbol('UPDATE') } } }
}

describe('SupplierRepository', () => {
  test('busca o fornecedor pelo CNPJ dentro da transação', async () => {
    const context = createContext()
    const supplier = { id: 8, cnpj: '11222333000181' }
    let queryOptions
    Supplier.findOne = async (options) => {
      queryOptions = options
      return supplier
    }

    const repository = new SupplierRepository(context)
    const result = await repository.getByCnpj('11222333000181')

    assert.equal(result, supplier)
    assert.deepEqual(queryOptions.where, { cnpj: '11222333000181' })
    assert.equal(queryOptions.transaction, context.dbSession)
  })

  test('devolve null quando o CNPJ não existe', async () => {
    Supplier.findOne = async () => null

    const repository = new SupplierRepository(createContext())
    const result = await repository.getByCnpj('00000000000000')

    assert.equal(result, null)
  })

  test('cria o fornecedor ligado ao usuário, com a área de atuação, dentro da transação', async () => {
    const context = createContext()
    const createdSupplier = { id: 8 }
    let createValues
    let createOptions
    Supplier.create = async (values, options) => {
      createValues = values
      createOptions = options
      return createdSupplier
    }

    const repository = new SupplierRepository(context)
    const result = await repository.create({ userId: 15, cnpj: '11222333000181', phone: '11999998888', serviceArea: 'Segurança' })

    assert.equal(result, createdSupplier)
    assert.deepEqual(createValues, { user_id: 15, cnpj: '11222333000181', service_area: 'Segurança', phone: '11999998888' })
    assert.equal(createOptions.transaction, context.dbSession)
  })
})
