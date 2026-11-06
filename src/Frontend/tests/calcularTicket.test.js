import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calcularTicket } from '../src/utils/calcularTicket.js'

test('valores iniciais da landing: R$ 228.500, 20% de margem e 12.000 pessoas', () => {
  const calculo = calcularTicket({ custoTotal: 228500, margem: 0.2, publico: 12000 })

  assert.equal(calculo.preco, 23.8)
  assert.equal(calculo.equilibrio, 9601)
  assert.deepEqual(calculo.cenarios, {
    pessimista: { publico: 8000, resultado: -38100 },
    realista: { publico: 12000, resultado: 57100 },
    otimista: { publico: 15000, resultado: 128500 },
  })
  // 9.601 ÷ 15.000 = 64,0067%: a barra mostra 64%
  assert.equal(Math.round(calculo.barraPercentual), 64)
})

test('sem margem, o público realista só paga o custo', () => {
  const calculo = calcularTicket({ custoTotal: 120000, margem: 0, publico: 1000 })

  assert.equal(calculo.preco, 120)
  assert.equal(calculo.equilibrio, 1000)
  assert.equal(calculo.cenarios.realista.resultado, 0)
  // 1.000 de 1.250 (otimista)
  assert.equal(calculo.barraPercentual, 80)
})
