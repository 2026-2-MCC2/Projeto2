import { afterEach, describe, expect, test, vi } from 'vitest'

const { post } = vi.hoisted(() => ({ post: vi.fn() }))

vi.mock('../infrastructure/api.js', () => ({ api: { post, get: vi.fn() } }))

import { enviarProposta, paraPropostaDaApi, traduzirStatusDaProposta } from './propostas.js'
import { RASCUNHO_VAZIO } from './rascunhosDePropostas.js'

const rascunhoCompleto = {
  ...RASCUNHO_VAZIO,
  valor: 'R$ 1.500,50',
  validade: '30/12/2026',
  descricao: '  Palco 10x8 com cobertura  ',
  naoIncluido: 'Gerador',
  prazoDeEntrega: 'Montagem na véspera',
  condicaoDePagamento: '50% na assinatura',
  equipe: '   ',
  garantia: '',
  observacoes: 'Frete incluso',
}

afterEach(() => post.mockReset())

describe('paraPropostaDaApi', () => {
  test('converte valor e data da tela e manda só os opcionais preenchidos', () => {
    expect(paraPropostaDaApi(rascunhoCompleto)).toEqual({
      amount: 1500.5,
      valid_until: '2026-12-30',
      description: 'Palco 10x8 com cobertura',
      delivery_terms: 'Montagem na véspera',
      payment_terms: '50% na assinatura',
      not_included: 'Gerador',
      notes: 'Frete incluso',
    })
  })
})

describe('traduzirStatusDaProposta', () => {
  test('traduz os status da API', () => {
    expect(traduzirStatusDaProposta('sent')).toBe('Enviada')
    expect(traduzirStatusDaProposta('under_review')).toBe('Em análise')
    expect(traduzirStatusDaProposta('accepted')).toBe('Aceita')
    expect(traduzirStatusDaProposta('rejected')).toBe('Recusada')
    expect(traduzirStatusDaProposta('desconhecido')).toBe('desconhecido')
  })
})

describe('enviarProposta', () => {
  test('envia para o item do evento com o body convertido', async () => {
    post.mockResolvedValue({ proposal_key: 'nova', status: 'sent' })

    const resposta = await enviarProposta('evento-1', 'item-1', rascunhoCompleto)

    expect(resposta).toEqual({ proposal_key: 'nova', status: 'sent' })
    expect(post).toHaveBeenCalledWith(
      '/supplier/events/evento-1/items/item-1/proposals',
      paraPropostaDaApi(rascunhoCompleto),
    )
  })
})
