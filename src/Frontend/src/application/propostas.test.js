import { afterEach, describe, expect, test, vi } from 'vitest'

const { post, get, put, remove } = vi.hoisted(() => ({
  post: vi.fn(),
  get: vi.fn(),
  put: vi.fn(),
  remove: vi.fn(),
}))

vi.mock('../infrastructure/api.js', () => ({ api: { post, get, put, delete: remove } }))

import {
  atualizarProposta,
  contarMinhasPropostas,
  enviarProposta,
  listarMinhasPropostas,
  paraPropostaDaApi,
  paraRascunho,
  propostaPodeSerAlterada,
  retirarProposta,
  traduzirStatusDaProposta,
} from './propostas.js'
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

afterEach(() => vi.resetAllMocks())

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

describe('paraRascunho', () => {
  test('é o caminho de volta do paraPropostaDaApi', () => {
    const rascunho = paraRascunho({
      amount: 1500.5,
      valid_until: '2026-12-30',
      description: 'Palco 10x8 com cobertura',
      not_included: 'Gerador',
      delivery_terms: 'Montagem na véspera',
      payment_terms: '50% na assinatura',
      team: null,
      warranty: null,
      notes: 'Frete incluso',
    })

    expect(rascunho).toEqual({
      valor: 'R$ 1.500,50',
      validade: '30/12/2026',
      descricao: 'Palco 10x8 com cobertura',
      naoIncluido: 'Gerador',
      prazoDeEntrega: 'Montagem na véspera',
      condicaoDePagamento: '50% na assinatura',
      equipe: '',
      garantia: '',
      observacoes: 'Frete incluso',
    })
    expect(paraPropostaDaApi(rascunho)).toEqual({
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

describe('propostaPodeSerAlterada', () => {
  test('só a enviada de evento em cotação', () => {
    const emCotacao = { status: 'open_for_quotes' }
    expect(propostaPodeSerAlterada({ status: 'sent', event: emCotacao })).toBe(true)
    expect(propostaPodeSerAlterada({ status: 'under_review', event: emCotacao })).toBe(false)
    expect(propostaPodeSerAlterada({ status: 'accepted', event: emCotacao })).toBe(false)
    expect(propostaPodeSerAlterada({ status: 'rejected', event: emCotacao })).toBe(false)
    expect(propostaPodeSerAlterada({ status: 'sent', event: { status: 'closed' } })).toBe(false)
  })
})

describe('chamadas das propostas do fornecedor', () => {
  test('listar, editar e retirar usam as rotas do fornecedor', async () => {
    get.mockResolvedValue({ data: [], total: 0, is_last_page: true })

    await listarMinhasPropostas({ status: 'sent', limit: 5, page: 2 })
    await atualizarProposta('p1', rascunhoCompleto)
    await retirarProposta('p1')

    expect(get).toHaveBeenCalledWith('/supplier/proposals?limit=5&page=2&status=sent')
    expect(put).toHaveBeenCalledWith('/supplier/proposals/p1', paraPropostaDaApi(rascunhoCompleto))
    expect(remove).toHaveBeenCalledWith('/supplier/proposals/p1')
  })

  test('contarMinhasPropostas soma o total de cada status', async () => {
    const totais = { all: 7, sent: 3, under_review: 1, accepted: 2, rejected: 1 }
    get.mockImplementation(async (caminho) => {
      const status = new URLSearchParams(caminho.split('?')[1]).get('status') ?? 'all'
      return { data: [], total: totais[status], is_last_page: true }
    })

    expect(await contarMinhasPropostas()).toEqual({
      todas: 7,
      sent: 3,
      under_review: 1,
      accepted: 2,
      rejected: 1,
    })
  })
})
