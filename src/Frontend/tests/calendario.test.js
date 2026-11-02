import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  ehAnterior,
  formatarParaInput,
  gerarGradeDoMes,
  paraDataLocal,
  saoMesmoDia,
} from '../src/domain/calendario.js'

describe('Domain: Calendario', () => {
  test('paraDataLocal converte DD/MM/AAAA para objeto Date local à meia-noite', () => {
    const data = paraDataLocal('25/12/2026')
    assert.ok(data instanceof Date)
    assert.equal(data.getDate(), 25)
    assert.equal(data.getMonth(), 11) // Dezembro é 11
    assert.equal(data.getFullYear(), 2026)
    assert.equal(data.getHours(), 0)

    assert.equal(paraDataLocal(''), null)
    assert.equal(paraDataLocal('invalido'), null)
    assert.equal(paraDataLocal('32/01/2026'), null)
  })

  test('formatarParaInput converte Date para DD/MM/AAAA', () => {
    const data = new Date(2026, 9, 18) // 18 de Outubro de 2026
    assert.equal(formatarParaInput(data), '18/10/2026')
    assert.equal(formatarParaInput(null), '')
  })

  test('saoMesmoDia compara se duas datas caem no mesmo dia civil', () => {
    const d1 = new Date(2026, 5, 10, 14, 30)
    const d2 = new Date(2026, 5, 10, 8, 0)
    const d3 = new Date(2026, 5, 11, 8, 0)

    assert.equal(saoMesmoDia(d1, d2), true)
    assert.equal(saoMesmoDia(d1, d3), false)
  })

  test('ehAnterior detecta se data é anterior ao limite (ignorando horas)', () => {
    const limite = new Date(2026, 9, 20, 23, 59)
    const ontem = new Date(2026, 9, 19, 10, 0)
    const mesmoDia = new Date(2026, 9, 20, 1, 0)
    const amanha = new Date(2026, 9, 21, 0, 0)

    assert.equal(ehAnterior(ontem, limite), true)
    assert.equal(ehAnterior(mesmoDia, limite), false)
    assert.equal(ehAnterior(amanha, limite), false)
  })

  test('gerarGradeDoMes gera semanas completas (múltiplo de 7)', () => {
    // Outubro de 2026 começa na Quinta (dia 1) e tem 31 dias
    const grade = gerarGradeDoMes(2026, 9)

    assert.equal(grade.length % 7, 0)
    assert.ok(grade.length >= 35)

    const diasDoMesAtual = grade.filter((d) => d.eDoMesAtual)
    assert.equal(diasDoMesAtual.length, 31)

    // O primeiro dia do mês atual deve ser o dia 1
    assert.equal(diasDoMesAtual[0].dia, 1)
    assert.equal(diasDoMesAtual[30].dia, 31)
  })
})
