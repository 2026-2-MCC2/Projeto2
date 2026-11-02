import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { TextTools } from '../../src/utils/text_tools.js'

describe('TextTools', () => {
  test('normalizeEmail tira espaços das pontas e deixa em minúsculas', () => {
    assert.equal(TextTools.normalizeEmail('  Maria@Exemplo.COM '), 'maria@exemplo.com')
  })

  test('onlyDigits mantém só os números', () => {
    assert.equal(TextTools.onlyDigits('11.222.333/0001-81'), '11222333000181')
    assert.equal(TextTools.onlyDigits('(11) 99999-8888'), '11999998888')
  })
})
