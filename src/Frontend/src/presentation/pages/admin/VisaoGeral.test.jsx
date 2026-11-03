/** @vitest-environment jsdom */

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const { buscarRelatorioAdmin } = vi.hoisted(() => ({
  buscarRelatorioAdmin: vi.fn(),
}))

vi.mock('../../../infrastructure/relatoriosAdmin.js', () => ({ buscarRelatorioAdmin }))

vi.mock('../../components/organizador/OrganizadorLayout.jsx', () => ({
  OrganizadorLayout: ({ children, titulo }) => (
    <div>
      <h1>{titulo}</h1>
      {children}
    </div>
  ),
}))

vi.mock('../../components/comum/EstadoDaTela.jsx', () => ({
  Carregando: ({ mensagem }) => <p role="status">{mensagem}</p>,
  ErroNaTela: ({ aoTentarDeNovo }) => (
    <div role="alert">
      <p>Não foi possível carregar os relatórios.</p>
      <button type="button" onClick={aoTentarDeNovo}>
        Tentar novamente
      </button>
    </div>
  ),
  Vazio: ({ titulo, mensagem }) => (
    <section>
      <h2>{titulo}</h2>
      <p>{mensagem}</p>
    </section>
  ),
}))

import { VisaoGeral } from './VisaoGeral.jsx'

const relatorioDeUmaPagina = {
  data: [
    {
      event_key: 'evento-rf14-1',
      name: 'Festival RF14',
      organizer: { name: 'Organizadora RF14' },
      status: 'open_for_quotes',
      reference_scenario: 'expected',
      proposal_count: 2,
      values: {
        planning_cost_total: '240.00',
        internal_cost_total: '30.00',
      },
      estimated_ticket: {
        minimum: '0.68',
        expected: '0.34',
        maximum: '0.17',
      },
    },
  ],
  summary: {
    registration_statuses: [
      { status: 'pending', profile: 'organizador', total: 2 },
      { status: 'pending', profile: 'fornecedor', total: 1 },
    ],
    event_statuses: [{ status: 'open_for_quotes', total: 1 }],
    proposal_statuses: [{ status: 'accepted', total: 2 }],
    values: {
      estimated_items_total: '200.00',
      selected_proposals_total: '240.00',
    },
  },
  page: 0,
  is_last_page: true,
}

describe('VisaoGeral administrativa', () => {
  beforeEach(() => {
    buscarRelatorioAdmin.mockReset()
    buscarRelatorioAdmin.mockResolvedValue(relatorioDeUmaPagina)
  })

  afterEach(() => cleanup())

  test('exibe indicadores e os valores consolidados do evento', async () => {
    render(<VisaoGeral />)

    expect(screen.getByRole('status')).toHaveTextContent('Carregando relatórios')
    expect(await screen.findByRole('heading', { name: 'Visão geral' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Cadastros pendentes' })).toBeInTheDocument()
    expect(screen.getByText('3', { selector: '.visao-geral__valor' })).toBeInTheDocument()
    expect(screen.getByText('Festival RF14')).toBeInTheDocument()
    expect(screen.getByText('Organizadora RF14')).toBeInTheDocument()
    expect(screen.getByText('Em cotação')).toBeInTheDocument()
    expect(screen.getByText('R$ 270,00')).toBeInTheDocument()
    expect(screen.getByText('R$ 0,34')).toBeInTheDocument()
    expect(buscarRelatorioAdmin).toHaveBeenCalledWith({ page: 0 })
  })

  test('aplica filtros de evento, organizador e período e reinicia a página', async () => {
    const usuario = userEvent.setup()
    render(<VisaoGeral />)
    await screen.findByText('Festival RF14')

    await usuario.type(screen.getByLabelText('Evento'), ' Festival RF14 ')
    await usuario.type(screen.getByLabelText('Organizador'), ' Organizadora RF14 ')
    await usuario.type(screen.getByLabelText('De'), '2026-10-15')
    await usuario.type(screen.getByLabelText('Até'), '2026-10-20')
    await usuario.click(screen.getByRole('button', { name: 'Aplicar filtros' }))

    await waitFor(() => {
      expect(buscarRelatorioAdmin).toHaveBeenLastCalledWith({
        eventName: 'Festival RF14',
        organizerName: 'Organizadora RF14',
        from: '2026-10-15',
        to: '2026-10-20',
        page: 0,
      })
    })
  })

  test('avança página e respeita o estado de última página retornado pela API', async () => {
    const usuario = userEvent.setup()
    buscarRelatorioAdmin
      .mockResolvedValueOnce({ ...relatorioDeUmaPagina, is_last_page: false })
      .mockResolvedValueOnce({ ...relatorioDeUmaPagina, page: 1, is_last_page: true })
    render(<VisaoGeral />)

    const proxima = await screen.findByRole('button', { name: 'Próxima' })
    expect(proxima).toBeEnabled()
    await usuario.click(proxima)

    expect(await screen.findByText('Página 2')).toBeInTheDocument()
    expect(buscarRelatorioAdmin).toHaveBeenLastCalledWith({ page: 1 })
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeDisabled()
  })

  test('mostra erro e tenta carregar novamente após ação do administrador', async () => {
    const usuario = userEvent.setup()
    buscarRelatorioAdmin.mockRejectedValueOnce(new Error('falha inicial'))
    render(<VisaoGeral />)

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findByText('Festival RF14')).toBeInTheDocument()
    expect(buscarRelatorioAdmin).toHaveBeenCalledTimes(2)
  })
})
