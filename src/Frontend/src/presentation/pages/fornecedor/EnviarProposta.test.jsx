/** @vitest-environment jsdom */

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const { buscarEventoDisponivel, enviarProposta, atualizarProposta, buscarMinhaProposta, toast } =
  vi.hoisted(() => ({
    buscarEventoDisponivel: vi.fn(),
    enviarProposta: vi.fn(),
    atualizarProposta: vi.fn(),
    buscarMinhaProposta: vi.fn(),
    toast: { sucesso: vi.fn() },
  }))

vi.mock('../../../application/eventosDisponiveis.js', () => ({ buscarEventoDisponivel }))
vi.mock('../../../application/propostas.js', async (importOriginal) => ({
  ...(await importOriginal()),
  enviarProposta,
  atualizarProposta,
  buscarMinhaProposta,
}))
vi.mock('../../toasts.js', () => ({ toast }))
vi.mock('../../hooks/useIsMobile.js', () => ({ useIsMobile: () => false }))
vi.mock('../../components/organizador/OrganizadorLayout.jsx', () => ({
  OrganizadorLayout: ({ children, titulo, apoio }) => (
    <main>
      <h1>{titulo}</h1>
      {apoio && <p>{apoio}</p>}
      {children}
    </main>
  ),
}))

import {
  atualizarRascunho,
  esquecerRascunhosDePropostas,
  lerRascunho,
} from '../../../application/rascunhosDePropostas.js'
import { EnviarProposta } from './EnviarProposta.jsx'
import { EnviarPropostaEtapa3 } from './EnviarPropostaEtapa3.jsx'
import { EventoDisponivel } from './EventoDisponivel.jsx'

const EVENTO = 'evento-rf10'
const ITEM = 'item-palco'

function eventoComItem(minhaProposta = null) {
  return {
    event_key: EVENTO,
    name: 'Festival RF10',
    description: 'Festival de teste',
    start_date: '2026-12-10T14:00:00.000Z',
    end_date: '2026-12-20T23:00:00.000Z',
    venue_name: 'Arena',
    address: 'Rua A, 1',
    city: 'São Paulo',
    state: 'SP',
    expected_audience: 500,
    status: 'open_for_quotes',
    items: [
      {
        item_key: ITEM,
        category: 'Estrutura',
        description: 'Palco principal',
        type: 'service',
        quantity: 1,
        estimated_value: 2000,
        notes: null,
        my_proposal: minhaProposta,
      },
    ],
  }
}

function renderizarEm(caminho) {
  return render(
    <MemoryRouter initialEntries={[caminho]}>
      <Routes>
        <Route path="/fornecedor/eventos/:id" element={<EventoDisponivel />} />
        <Route
          path="/fornecedor/eventos/:id/itens/:itemKey/propostas/etapa-1"
          element={<EnviarProposta />}
        />
        <Route
          path="/fornecedor/eventos/:id/itens/:itemKey/propostas/etapa-3"
          element={<EnviarPropostaEtapa3 />}
        />
        <Route path="/fornecedor/propostas" element={<p>Tela de minhas propostas</p>} />
        <Route path="/fornecedor/propostas/:proposalKey" element={<p>Tela do detalhe</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

const etapa3 = `/fornecedor/eventos/${EVENTO}/itens/${ITEM}/propostas/etapa-3`

beforeEach(() => {
  esquecerRascunhosDePropostas()
  buscarEventoDisponivel.mockResolvedValue(eventoComItem())
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('EventoDisponivel', () => {
  test('item sem proposta mostra o botão de enviar para a etapa 1 daquele item', async () => {
    renderizarEm(`/fornecedor/eventos/${EVENTO}`)

    const enviar = await screen.findByRole('link', { name: 'Enviar proposta' })
    expect(enviar).toHaveAttribute(
      'href',
      `/fornecedor/eventos/${EVENTO}/itens/${ITEM}/propostas/etapa-1`,
    )
  })

  test('item com proposta mostra o status traduzido e o link para o detalhe dela', async () => {
    buscarEventoDisponivel.mockResolvedValue(
      eventoComItem({
        proposal_key: 'p1',
        status: 'accepted',
        amount: 1800,
        valid_until: '2026-12-15',
      }),
    )

    renderizarEm(`/fornecedor/eventos/${EVENTO}`)

    expect(await screen.findByText(/Sua proposta: Aceita/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver proposta' })).toHaveAttribute(
      'href',
      '/fornecedor/propostas/p1',
    )
    expect(screen.queryByRole('link', { name: 'Enviar proposta' })).not.toBeInTheDocument()
  })
})

describe('Envio de proposta', () => {
  test('a etapa 1 mostra o item real e guarda o que foi digitado no rascunho', async () => {
    const usuario = userEvent.setup()
    renderizarEm(`/fornecedor/eventos/${EVENTO}/itens/${ITEM}/propostas/etapa-1`)

    expect(await screen.findByText('Item: Palco principal')).toBeInTheDocument()
    await usuario.type(screen.getByLabelText(/Valor total da proposta/), 'R$ 1.800,00')

    expect(lerRascunho(EVENTO, ITEM).valor).toBe('R$ 1.800,00')
    expect(screen.getByText('10% abaixo do previsto')).toBeInTheDocument()
  })

  test('abrir a etapa 3 sem valor e validade volta para a etapa 1', async () => {
    renderizarEm(etapa3)

    expect(await screen.findByLabelText(/Valor total da proposta/)).toBeInTheDocument()
  })

  test('envia só na etapa 3, com o botão desabilitado, e vai para Minhas propostas', async () => {
    const usuario = userEvent.setup()
    atualizarRascunho(EVENTO, ITEM, {
      valor: 'R$ 1.800,00',
      validade: '15/12/2026',
      descricao: 'Palco 10x8',
    })
    let concluirEnvio
    enviarProposta.mockReturnValue(new Promise((resolver) => (concluirEnvio = resolver)))

    renderizarEm(etapa3)
    await usuario.type(await screen.findByLabelText(/Prazo de entrega ou montagem/), 'Na véspera')
    await usuario.type(screen.getByLabelText(/Condição de pagamento/), 'À vista')
    await usuario.click(screen.getByRole('button', { name: 'Enviar proposta' }))

    const enviando = screen.getByRole('button', { name: 'Enviando...' })
    expect(enviando).toBeDisabled()
    expect(enviarProposta).toHaveBeenCalledWith(
      EVENTO,
      ITEM,
      expect.objectContaining({
        valor: 'R$ 1.800,00',
        prazoDeEntrega: 'Na véspera',
        condicaoDePagamento: 'À vista',
      }),
    )

    concluirEnvio({ proposal_key: 'nova', status: 'sent' })
    expect(await screen.findByText('Tela de minhas propostas')).toBeInTheDocument()
    expect(toast.sucesso).toHaveBeenCalledWith('Proposta enviada', { descricao: 'Palco principal' })
    // o rascunho do item enviado é descartado
    expect(lerRascunho(EVENTO, ITEM).valor).toBe('')
  })

  test('erro da API aparece com a mensagem em português e o botão volta', async () => {
    const usuario = userEvent.setup()
    atualizarRascunho(EVENTO, ITEM, {
      valor: 'R$ 1.800,00',
      validade: '15/12/2026',
      descricao: 'Palco 10x8',
      prazoDeEntrega: 'Na véspera',
      condicaoDePagamento: 'À vista',
    })
    enviarProposta.mockRejectedValue(new Error('Você já enviou uma proposta para este item.'))

    renderizarEm(etapa3)
    await usuario.click(await screen.findByRole('button', { name: 'Enviar proposta' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Você já enviou uma proposta para este item.',
    )
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Enviar proposta' })).toBeEnabled(),
    )
    expect(toast.sucesso).not.toHaveBeenCalled()
  })

  test('proposta já analisada não abre o formulário de novo', async () => {
    buscarEventoDisponivel.mockResolvedValue(
      eventoComItem({
        proposal_key: 'p1',
        status: 'accepted',
        amount: 1800,
        valid_until: '2026-12-15',
      }),
    )

    renderizarEm(`/fornecedor/eventos/${EVENTO}/itens/${ITEM}/propostas/etapa-1`)

    expect(await screen.findByText('Esta proposta não pode mais ser alterada')).toBeInTheDocument()
    expect(screen.getByText('Situação: Aceita.')).toBeInTheDocument()
    expect(screen.queryByLabelText(/Valor total da proposta/)).not.toBeInTheDocument()
    expect(buscarMinhaProposta).not.toHaveBeenCalled()
  })
})

describe('Edição de proposta enviada', () => {
  const propostaEnviada = {
    proposal_key: 'p1',
    status: 'sent',
    amount: 1800,
    valid_until: '2026-12-15',
  }

  // detalhe do GET /supplier/proposals/p1
  const detalhe = {
    proposal_key: 'p1',
    status: 'sent',
    amount: 1800.5,
    valid_until: '2026-12-15',
    description: 'Palco 10x8',
    not_included: null,
    delivery_terms: 'Na véspera',
    payment_terms: 'À vista',
    team: 'Equipe de 4',
    warranty: null,
    notes: null,
    event: { event_key: EVENTO, name: 'Festival RF10', status: 'open_for_quotes' },
    item: { item_key: ITEM, description: 'Palco principal' },
  }

  beforeEach(() => {
    buscarEventoDisponivel.mockResolvedValue(eventoComItem(propostaEnviada))
    buscarMinhaProposta.mockResolvedValue(detalhe)
  })

  test('a etapa 1 abre como edição, já preenchida com os dados da proposta', async () => {
    renderizarEm(`/fornecedor/eventos/${EVENTO}/itens/${ITEM}/propostas/etapa-1`)

    // o título já aparece no "carregando": espera o campo, que só existe com a proposta carregada
    expect(await screen.findByLabelText(/Valor total da proposta/)).toHaveValue('R$ 1.800,50')
    expect(screen.getByRole('heading', { name: 'Editar proposta' })).toBeInTheDocument()
    expect(buscarMinhaProposta).toHaveBeenCalledWith('p1')
    expect(lerRascunho(EVENTO, ITEM)).toMatchObject({
      validade: '15/12/2026',
      descricao: 'Palco 10x8',
      equipe: 'Equipe de 4',
      chaveDaProposta: 'p1',
    })
  })

  test('a etapa 3 salva com o PUT e volta para o detalhe da proposta', async () => {
    const usuario = userEvent.setup()
    renderizarEm(etapa3)

    const pagamento = await screen.findByLabelText(/Condição de pagamento/)
    expect(pagamento).toHaveValue('À vista')
    await usuario.clear(pagamento)
    await usuario.type(pagamento, '30 dias')
    await usuario.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(await screen.findByText('Tela do detalhe')).toBeInTheDocument()
    expect(atualizarProposta).toHaveBeenCalledWith(
      'p1',
      expect.objectContaining({ valor: 'R$ 1.800,50', condicaoDePagamento: '30 dias' }),
    )
    expect(enviarProposta).not.toHaveBeenCalled()
    expect(toast.sucesso).toHaveBeenCalledWith('Proposta atualizada', {
      descricao: 'Palco principal',
    })
  })
})
