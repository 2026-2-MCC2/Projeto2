import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  formatarInteiro,
  formatarMoeda,
  formatarMoedaSemCentavos,
  formatarResultado,
} from '../src/domain/formatacao.js'

// o Intl separa o "R$" do número com espaço não separável (U+00A0)
const ESPACO = ' '

test('moeda com centavos, como o preço sugerido', () => {
  assert.equal(formatarMoeda(23.8), `R$${ESPACO}23,80`)
  // valor no meio de uma contagem também sai formatado
  assert.equal(formatarMoeda(12.3456), `R$${ESPACO}12,35`)
})

test('inteiros e moeda sem centavos', () => {
  assert.equal(formatarInteiro(9601), '9.601')
  assert.equal(formatarInteiro(4800.6), '4.801')
  assert.equal(formatarMoedaSemCentavos(228500), `R$${ESPACO}228.500`)
})

test('resultado com sinal separado e o menos tipográfico (U+2212)', () => {
  assert.equal(formatarResultado(57100), `+ R$${ESPACO}57.100`)
  assert.equal(formatarResultado(-38100), `− R$${ESPACO}38.100`)
  assert.equal(formatarResultado(0), `+ R$${ESPACO}0`)
})
