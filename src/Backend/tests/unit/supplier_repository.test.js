import assert from 'node:assert/strict'
import { afterEach, describe, test } from 'node:test'

import { ItemCategory, Supplier, SupplierCategory } from '../../src/models/index.js'
import { SupplierRepository } from '../../src/repositories/supplier_repository.js'

const originalFindOne = Supplier.findOne
const originalCreate = Supplier.create
const originalFindAllCategories = ItemCategory.findAll
const originalBulkCreateSupplierCategories = SupplierCategory.bulkCreate

afterEach(() => {
  Supplier.findOne = originalFindOne
  Supplier.create = originalCreate
  ItemCategory.findAll = originalFindAllCategories
  SupplierCategory.bulkCreate = originalBulkCreateSupplierCategories
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

  test('cria o fornecedor e liga ele às categorias, tudo dentro da transação', async () => {
    const context = createContext()
    const createdSupplier = { id: 8 }
    let createValues
    let categoryQuery
    let linkedCategories
    const transactions = []
    Supplier.create = async (values, options) => {
      createValues = values
      transactions.push(options.transaction)
      return createdSupplier
    }
    ItemCategory.findAll = async (options) => {
      categoryQuery = options.where
      transactions.push(options.transaction)
      return [{ id: 2 }, { id: 8 }]
    }
    SupplierCategory.bulkCreate = async (rows, options) => {
      linkedCategories = rows
      transactions.push(options.transaction)
    }

    const repository = new SupplierRepository(context)
    const result = await repository.create({
      userId: 15,
      cnpj: '11222333000181',
      phone: '11999998888',
      categories: ['Bebidas', 'Segurança'],
    })

    assert.equal(result, createdSupplier)
    assert.deepEqual(createValues, { user_id: 15, cnpj: '11222333000181', phone: '11999998888' })
    assert.deepEqual(categoryQuery, { name: ['Bebidas', 'Segurança'] })
    assert.deepEqual(linkedCategories, [
      { supplier_id: 8, category_id: 2 },
      { supplier_id: 8, category_id: 8 },
    ])
    assert.ok(transactions.every((transaction) => transaction === context.dbSession))
  })
})
