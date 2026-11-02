import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import { buscarEnderecoPorCep } from '../src/infrastructure/cep.js'
import { consultarCep } from '../src/application/localizacao.js'

describe('Infrastructure & Application: CEP', () => {
  it('retorna null para CEP invalido ou com tamanho diferente de 8 digitos', async () => {
    assert.equal(await buscarEnderecoPorCep(''), null)
    assert.equal(await buscarEnderecoPorCep('123'), null)
    assert.equal(await buscarEnderecoPorCep(null), null)
  })

  it('consulta e formata endereco do ViaCEP com sucesso', async () => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = mock.fn(async () => ({
      ok: true,
      json: async () => ({
        cep: '05001-100',
        logradouro: 'Avenida Francisco Matarazzo',
        bairro: 'Água Branca',
        localidade: 'São Paulo',
        uf: 'SP',
      }),
    }))

    try {
      const endereco = await consultarCep('05001-100')
      assert.deepEqual(endereco, {
        logradouro: 'Avenida Francisco Matarazzo',
        bairro: 'Água Branca',
        cidade: 'São Paulo',
        estado: 'SP',
        enderecoCompleto: 'Avenida Francisco Matarazzo — Água Branca',
      })
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('retorna null quando o ViaCEP devolve erro: true', async () => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = mock.fn(async () => ({
      ok: true,
      json: async () => ({ erro: true }),
    }))

    try {
      const endereco = await consultarCep('99999-999')
      assert.equal(endereco, null)
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})
