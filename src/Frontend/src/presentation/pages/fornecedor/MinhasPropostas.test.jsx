/** @vitest-environment jsdom */

import { cleanup, render, screen, within } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const {
  listarMinhasPropostas,
  contarMinhasPropostas,
  buscarMinhaProposta,
  retirarProposta,
  toast,
} = vi.hoisted(() => ({
  listarMinhasPropostas: vi.fn(),
  contarMinhasPropostas: vi.fn(),
  buscarMinhaProposta: vi.fn(),
  retirarProposta: vi.fn(),
  toast: { sucesso: vi.fn(), erro: vi.fn() },
}))

vi.mock('../../../application/propostas.js', async (importOriginal) => ({
  ...(await importOriginal()),
  listarMinhasPropostas,
  contarMinhasPropostas,
  buscarMinhaProposta,
  retirarProposta,
}))
vi.mock('../../toasts.js', () => ({ toast }))
vi.mock('../../hooks/useIsMobile.js', () => ({ useIsMobile: () => false }))
vi.mock('../../components/organizador/OrganizadorLayout.jsx', () => ({
  OrganizadorLayout: ({ children, titulo }) => (
    <main>
      <h1>{titulo}</h1>
      {children}
    </main>
  ),
}))

import { DetalheDaProposta } from './DetalheDaProposta.jsx'
import { MinhasPropostas } from './MinhasPropostas.jsx'

function propostaDaLista(overrides = {}) {
  return {
    proposal_key: 'p1',
    event: { event_key: 'evento-1', name: 'Festival RF10', status: 'open_for_quotes' },
    item: { item_key: 'item-1', description: 'Palco principal', category: 'Estrutura' },
    amount: 1800.5,
    valid_until: '2026-12-15',
    status: 'sent',
    selected: false,
    sent_at: '2026-11-04T15:00:00.000Z',
    ...overrides,
  }
}

function detalhe(overrides = {}) {
  const base = propostaDaLista()
  return {
    ...base,
    event: { ...base.event, end_date: '2026-12-20T23:00:00.000Z' },
    item: { ...base.item, type: 'service', quantity: 1 },
    description: 'Palco 10x8 com cobertura',
    not_included: null,
    delivery_terms: 'Na véspera',
    payment_terms: 'À vista',
    team: null,
    warranty: null,
    notes: null,
    photos: [],
    ...overrides,
  }
}

function renderizarEm(caminho) {
  return render(
    <MemoryRouter initialEntries={[caminho]}>
      <Routes>
        <Route path="/fornecedor/propostas" element={<MinhasPropostas />} />
        <Route path="/fornecedor/propostas/:proposalKey" element={<DetalheDaProposta />} />
        <Route path="/fornecedor/eventos" element={<p>Tela de eventos</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  contarMinhasPropostas.mockResolvedValue({
    todas: 3,
    sent: 1,
    under_review: 0,
    accepted: 1,
    rejected: 1,
  })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('MinhasPropostas', () => {
  test('lista as propostas da API com status em português, R$ e data em pt-BR', async () => {
    listarMinhasPropostas.mockResolvedValue({
      data: [
        propostaDaLista(),
        propostaDaLista({ proposal_key: 'p2', status: 'accepted', selected: true, amount: 950 }),
      ],
      total: 2,
      is_last_page: true,
    })

    renderizarEm('/fornecedor/propostas')

    const linhas = await screen.findAllByRole('row')
    const primeira = within(linhas[1])
    expect(primeira.getByRole('link', { name: 'Palco principal' })).toHaveAttribute(
      'href',
      '/fornecedor/propostas/p1',
    )
    expect(primeira.getByText('Festival RF10')).toBeInTheDocument()
    expect(primeira.getByText('R$ 1.800,50')).toBeInTheDocument()
    expect(primeira.getByText('Enviada')).toBeInTheDocument()
    expect(primeira.getByText('04 de nov. de 2026')).toBeInTheDocument()
    expect(within(linhas[2]).getByText('Aceita')).toBeInTheDocument()

    // os cartões do topo usam os totais por status
    expect(screen.getByText('Enviadas').nextSibling).toHaveTextContent('3')
    expect(screen.getByText('Aceitas').nextSibling).toHaveTextContent('1')
    expect(listarMinhasPropostas).toHaveBeenCalledWith({ limit: 20, page: 0 })
  })

  test('sem propostas mostra o vazio com o caminho para os eventos', async () => {
    listarMinhasPropostas.mockResolvedValue({ data: [], total: 0, is_last_page: true })
    contarMinhasPropostas.mockResolvedValue({
      todas: 0,
      sent: 0,
      under_review: 0,
      accepted: 0,
      rejected: 0,
    })

    renderizarEm('/fornecedor/propostas')

    expect(await screen.findByText('Você ainda não enviou propostas')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver eventos disponíveis' })).toHaveAttribute(
      'href',
      '/fornecedor/eventos',
    )
  })

  test('erro ao carregar mostra o erro e tenta de novo', async () => {
    const usuario = userEvent.setup()
    listarMinhasPropostas.mockRejectedValueOnce(new Error('Não foi possível conectar ao servidor.'))
    listarMinhasPropostas.mockResolvedValue({
      data: [propostaDaLista()],
      total: 1,
      is_last_page: true,
    })

    renderizarEm('/fornecedor/propostas')

    expect(await screen.findByText('Não foi possível conectar ao servidor.')).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(await screen.findByRole('link', { name: 'Palco principal' })).toBeInTheDocument()
  })

  test('carrega a próxima página quando há mais propostas', async () => {
    const usuario = userEvent.setup()
    listarMinhasPropostas
      .mockResolvedValueOnce({ data: [propostaDaLista()], total: 2, is_last_page: false })
      .mockResolvedValueOnce({
        data: [
          propostaDaLista({
            proposal_key: 'p2',
            item: { ...propostaDaLista().item, description: 'Som' },
          }),
        ],
        total: 2,
        is_last_page: true,
      })

    renderizarEm('/fornecedor/propostas')
    await usuario.click(await screen.findByRole('button', { name: 'Carregar mais propostas' }))

    expect(await screen.findByRole('link', { name: 'Som' })).toBeInTheDocument()
    expect(listarMinhasPropostas).toHaveBeenLastCalledWith({ limit: 20, page: 1 })
    expect(
      screen.queryByRole('button', { name: 'Carregar mais propostas' }),
    ).not.toBeInTheDocument()
  })
})

describe('DetalheDaProposta', () => {
  test('proposta enviada de evento em cotação mostra os dados, Editar e Retirar', async () => {
    buscarMinhaProposta.mockResolvedValue(detalhe())

    renderizarEm('/fornecedor/propostas/p1')

    expect(await screen.findByRole('heading', { name: 'Palco principal' })).toBeInTheDocument()
    expect(screen.getByText('R$ 1.800,50')).toBeInTheDocument()
    expect(screen.getByText('15/12/2026')).toBeInTheDocument()
    expect(screen.getByText('Palco 10x8 com cobertura')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Editar' })).toHaveAttribute(
      'href',
      '/fornecedor/eventos/evento-1/itens/item-1/propostas/etapa-1',
    )
    expect(screen.getByRole('button', { name: 'Retirar proposta' })).toBeInTheDocument()
  })

  test('proposta aceita fica só para consulta', async () => {
    buscarMinhaProposta.mockResolvedValue(detalhe({ status: 'accepted', selected: true }))

    renderizarEm('/fornecedor/propostas/p1')

    expect(await screen.findByText('Aceita')).toBeInTheDocument()
    expect(screen.getByText(/já analisou esta proposta/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Editar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Retirar proposta' })).not.toBeInTheDocument()
  })

  test('evento fora de cotação também deixa só a consulta', async () => {
    const base = detalhe()
    buscarMinhaProposta.mockResolvedValue({ ...base, event: { ...base.event, status: 'closed' } })

    renderizarEm('/fornecedor/propostas/p1')

    expect(await screen.findByText(/não está mais em cotação/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Editar' })).not.toBeInTheDocument()
  })

  test('retirar confirma no modal, chama o DELETE e volta para a lista', async () => {
    const usuario = userEvent.setup()
    buscarMinhaProposta.mockResolvedValue(detalhe())
    listarMinhasPropostas.mockResolvedValue({ data: [], total: 0, is_last_page: true })
    retirarProposta.mockResolvedValue(null)

    renderizarEm('/fornecedor/propostas/p1')
    await usuario.click(await screen.findByRole('button', { name: 'Retirar proposta' }))

    const modal = screen.getByRole('dialog', { name: 'Retirar esta proposta?' })
    await usuario.click(within(modal).getByRole('button', { name: 'Retirar proposta' }))

    expect(await screen.findByText('Você ainda não enviou propostas')).toBeInTheDocument()
    expect(retirarProposta).toHaveBeenCalledWith('p1')
    expect(toast.sucesso).toHaveBeenCalledWith('Proposta retirada', {
      descricao: 'Palco principal',
    })
  })

  test('retirada recusada pela API mostra o erro e recarrega a proposta', async () => {
    const usuario = userEvent.setup()
    buscarMinhaProposta.mockResolvedValueOnce(detalhe())
    buscarMinhaProposta.mockResolvedValue(detalhe({ status: 'accepted' }))
    retirarProposta.mockRejectedValue(new Error('Esta proposta já foi analisada pelo organizador.'))

    renderizarEm('/fornecedor/propostas/p1')
    await usuario.click(await screen.findByRole('button', { name: 'Retirar proposta' }))
    const modal = screen.getByRole('dialog', { name: 'Retirar esta proposta?' })
    await usuario.click(within(modal).getByRole('button', { name: 'Retirar proposta' }))

    expect(await screen.findByText(/já analisou esta proposta/)).toBeInTheDocument()
    expect(toast.erro).toHaveBeenCalledWith('Não foi possível retirar a proposta', {
      descricao: 'Esta proposta já foi analisada pelo organizador.',
    })
  })

  test('proposta de outro fornecedor ou retirada responde 404 e mostra não encontrada', async () => {
    const naoEncontrada = Object.assign(new Error('A proposta não foi encontrada.'), {
      status: 404,
    })
    buscarMinhaProposta.mockRejectedValue(naoEncontrada)

    renderizarEm('/fornecedor/propostas/p1')

    expect(await screen.findByText('Proposta não encontrada')).toBeInTheDocument()
  })
})
