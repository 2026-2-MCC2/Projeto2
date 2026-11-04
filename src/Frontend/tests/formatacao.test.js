import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  formatarCep,
  formatarCnpj,
  formatarTelefone,
  mascararCep,
  iniciais,
} from '../src/domain/formatacao.js'

describe('Domain: Formatação', () => {
  it('formatarCep formata 8 digitos com hifen', () => {
    assert.equal(formatarCep('05001100'), '05001-100')
    assert.equal(formatarCep('05001-100'), '05001-100')
    assert.equal(formatarCep('123'), '123')
    assert.equal(formatarCep(''), '')
  })

  it('mascararCep aplica mascara progressiva conforme usuario digita', () => {
    assert.equal(mascararCep('05001'), '05001')
    assert.equal(mascararCep('050011'), '05001-1')
    assert.equal(mascararCep('05001100'), '05001-100')
    assert.equal(mascararCep('05001100999'), '05001-100') // limita em 8 digitos
    assert.equal(mascararCep('abc05001-100xyz'), '05001-100')
  })

  it('formatarCnpj formata 14 digitos', () => {
    assert.equal(formatarCnpj('12345678000199'), '12.345.678/0001-99')
    assert.equal(formatarCnpj('12abc34501de35'), '12.ABC.345/01DE-35')
  })

  it('formatarTelefone formata 10 e 11 digitos', () => {
    assert.equal(formatarTelefone('11999998888'), '(11) 99999-8888')
    assert.equal(formatarTelefone('1133334444'), '(11) 3333-4444')
  })

  it('iniciais extrai as primeiras letras do nome', () => {
    assert.equal(iniciais('Lucas Santos'), 'LS')
    assert.equal(iniciais('TrocaTicket'), 'T')
  })
})
