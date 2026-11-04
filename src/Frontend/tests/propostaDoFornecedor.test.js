import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { paraDataIso, validarValidadeDaProposta } from '../src/domain/validacao.js'
import {
  RASCUNHO_VAZIO,
  atualizarRascunho,
  descartarRascunho,
  esquecerRascunhosDePropostas,
  lerRascunho,
  primeiraEtapaIncompleta,
} from '../src/application/rascunhosDePropostas.js'

describe('Domain: validade da proposta', () => {
  it('paraDataIso usa o dia local da data', () => {
    assert.equal(paraDataIso(new Date(2026, 10, 5)), '2026-11-05')
    assert.equal(paraDataIso(new Date(2027, 0, 31)), '2027-01-31')
  })

  it('aceita até o dia do fim do evento, comparado em UTC como a API', () => {
    const fim = '2026-12-20T23:00:00.000Z'
    assert.equal(validarValidadeDaProposta('19/12/2026', fim), '')
    assert.equal(validarValidadeDaProposta('20/12/2026', fim), '')
    assert.equal(
      validarValidadeDaProposta('21/12/2026', fim),
      'A validade não pode passar do fim do evento (20/12/2026).',
    )
  })

  it('não opina sem data válida ou sem o fim do evento (a regra dataFutura cuida do formato)', () => {
    assert.equal(validarValidadeDaProposta('31/02/2027', '2026-12-20T23:00:00.000Z'), '')
    assert.equal(validarValidadeDaProposta('20/12/2026', undefined), '')
  })
})

describe('Application: rascunho da proposta', () => {
  it('guarda o rascunho por item e mantém os campos ao atualizar', () => {
    esquecerRascunhosDePropostas()
    atualizarRascunho('evento-1', 'item-1', { valor: 'R$ 1.500,00' })
    atualizarRascunho('evento-1', 'item-1', { validade: '30/12/2026' })

    assert.deepEqual(lerRascunho('evento-1', 'item-1'), {
      ...RASCUNHO_VAZIO,
      valor: 'R$ 1.500,00',
      validade: '30/12/2026',
    })
    assert.deepEqual(lerRascunho('evento-1', 'item-2'), RASCUNHO_VAZIO)
  })

  it('descarta um item e esquece todos ao sair da conta', () => {
    esquecerRascunhosDePropostas()
    atualizarRascunho('evento-1', 'item-1', { valor: '100' })
    atualizarRascunho('evento-1', 'item-2', { valor: '200' })

    descartarRascunho('evento-1', 'item-1')
    assert.deepEqual(lerRascunho('evento-1', 'item-1'), RASCUNHO_VAZIO)
    assert.equal(lerRascunho('evento-1', 'item-2').valor, '200')

    esquecerRascunhosDePropostas()
    assert.deepEqual(lerRascunho('evento-1', 'item-2'), RASCUNHO_VAZIO)
  })

  it('primeiraEtapaIncompleta aponta a etapa com obrigatório vazio', () => {
    assert.equal(primeiraEtapaIncompleta(RASCUNHO_VAZIO), 1)
    assert.equal(
      primeiraEtapaIncompleta({ ...RASCUNHO_VAZIO, valor: 'R$ 0,00', validade: '30/12/2026' }),
      1,
    )
    assert.equal(
      primeiraEtapaIncompleta({ ...RASCUNHO_VAZIO, valor: '1500', validade: '31/02/2027' }),
      1,
    )
    assert.equal(
      primeiraEtapaIncompleta({ ...RASCUNHO_VAZIO, valor: '1500', validade: '30/12/2026' }),
      2,
    )
    assert.equal(
      primeiraEtapaIncompleta({
        ...RASCUNHO_VAZIO,
        valor: '1500',
        validade: '30/12/2026',
        descricao: 'Palco',
      }),
      null,
    )
  })
})
