import { useEffect, useState } from 'react'
import { OrganizadorLayout } from '../../components/organizador/OrganizadorLayout.jsx'
import { Carregando, ErroNaTela, Vazio } from '../../components/comum/EstadoDaTela.jsx'
import { buscarRelatorioAdmin } from '../../../infrastructure/relatoriosAdmin.js'
import '../../styles/admin.css'

const COLUNAS = [
  { chave: 'nome', rotulo: 'Evento' },
  { chave: 'organizador', rotulo: 'Organizador' },
  { chave: 'situacao', rotulo: 'Situação' },
  { chave: 'custos', rotulo: 'Custo planejado' },
  { chave: 'propostas', rotulo: 'Propostas' },
  { chave: 'ticket', rotulo: 'Ticket estimado' },
]

function contar(statuses, status, profile) {
  return statuses
    .filter((item) => item.status === status && (profile === undefined || item.profile === profile))
    .reduce((total, item) => total + item.total, 0)
}

function formatarMoeda(valor) {
  const numero = Number(valor)
  if (!Number.isFinite(numero)) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numero)
}

function mapearStatus(status) {
  return (
    {
      draft: 'Rascunho',
      open_for_quotes: 'Em cotação',
      closed: 'Encerrado',
      canceled: 'Cancelado',
    }[status] ?? status
  )
}

function mapearEventos(eventos) {
  return eventos.map((evento) => ({
    id: evento.event_key,
    nome: evento.name,
    organizador: evento.organizer.name,
    situacao: mapearStatus(evento.status),
    custos: formatarMoeda(
      Number(evento.values.planning_cost_total) + Number(evento.values.internal_cost_total),
    ),
    propostas: String(evento.proposal_count),
    ticket: evento.estimated_ticket?.[evento.reference_scenario]
      ? formatarMoeda(evento.estimated_ticket[evento.reference_scenario])
      : '—',
  }))
}

function Indicadores({ summary }) {
  const pendentes = contar(summary.registration_statuses, 'pending')
  const organizadores = contar(summary.registration_statuses, 'pending', 'organizador')
  const fornecedores = contar(summary.registration_statuses, 'pending', 'fornecedor')
  const eventos = summary.event_statuses.reduce((total, item) => total + item.total, 0)
  const emCotacao = contar(summary.event_statuses, 'open_for_quotes')
  const propostas = summary.proposal_statuses.reduce((total, item) => total + item.total, 0)

  const indicadores = [
    {
      id: 'cadastros-pendentes',
      titulo: 'Cadastros pendentes',
      valor: pendentes,
      detalhe: `${organizadores} organizadores e ${fornecedores} fornecedores`,
    },
    {
      id: 'eventos-cotacao',
      titulo: 'Eventos em cotação',
      valor: emCotacao,
      detalhe: `de ${eventos} eventos`,
    },
    {
      id: 'propostas-recebidas',
      titulo: 'Propostas recebidas',
      valor: propostas,
      detalhe: 'em todos os eventos',
    },
    {
      id: 'estimativas-planejamento',
      titulo: 'Estimativas de itens',
      valor: formatarMoeda(summary.values.estimated_items_total),
      detalhe: `Propostas selecionadas: ${formatarMoeda(summary.values.selected_proposals_total)}`,
    },
  ]

  return (
    <section className="visao-geral__indicadores" aria-label="Indicadores da plataforma">
      {indicadores.map((indicador) => (
        <article className="visao-geral__indicador" key={indicador.id}>
          <h2>{indicador.titulo}</h2>
          <p className="visao-geral__valor">{indicador.valor}</p>
          <p className="visao-geral__detalhe">{indicador.detalhe}</p>
        </article>
      ))}
    </section>
  )
}

function EtiquetaSituacao({ situacao }) {
  const variacao = situacao
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replaceAll(' ', '-')
  return (
    <span className={`visao-geral__etiqueta visao-geral__etiqueta--${variacao}`}>{situacao}</span>
  )
}

function TabelaEventos({ eventos }) {
  return (
    <div className="visao-geral__tabela-scroll">
      <table className="visao-geral__tabela">
        <thead>
          <tr>
            {COLUNAS.map((coluna) => (
              <th className={`visao-geral__celula--${coluna.chave}`} key={coluna.chave} scope="col">
                {coluna.rotulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {eventos.map((evento) => (
            <tr key={evento.id}>
              {COLUNAS.map((coluna) => (
                <td
                  className={`visao-geral__celula--${coluna.chave}`}
                  key={coluna.chave}
                  data-label={coluna.rotulo}
                >
                  {coluna.chave === 'situacao' ? (
                    <EtiquetaSituacao situacao={evento.situacao} />
                  ) : (
                    evento[coluna.chave]
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function VisaoGeral() {
  const [filtrosRascunho, setFiltrosRascunho] = useState({
    eventName: '',
    organizerName: '',
    from: '',
    to: '',
  })
  const [filtros, setFiltros] = useState({})
  const [page, setPage] = useState(0)
  const [situacao, setSituacao] = useState('carregando')
  const [relatorio, setRelatorio] = useState(null)
  const [erro, setErro] = useState(null)
  const [erroFiltro, setErroFiltro] = useState('')
  const [tentativa, setTentativa] = useState(0)

  useEffect(() => {
    let telaAberta = true

    buscarRelatorioAdmin({ ...filtros, page })
      .then((resultado) => {
        if (!telaAberta) return
        setRelatorio(resultado)
        setSituacao('pronto')
      })
      .catch((falha) => {
        if (!telaAberta) return
        setErro(falha)
        setSituacao('erro')
      })

    return () => {
      telaAberta = false
    }
  }, [filtros, page, tentativa])

  function tentarDeNovo() {
    setErro(null)
    setSituacao('carregando')
    setTentativa((valor) => valor + 1)
  }

  const todosEventos = relatorio ? mapearEventos(relatorio.data) : []

  function aplicarFiltros(event) {
    event.preventDefault()
    if (filtrosRascunho.from && filtrosRascunho.to && filtrosRascunho.from > filtrosRascunho.to) {
      setErroFiltro('A data inicial não pode ser posterior à data final.')
      return
    }
    setErroFiltro('')
    setSituacao('carregando')
    setFiltros({
      eventName: filtrosRascunho.eventName.trim(),
      organizerName: filtrosRascunho.organizerName.trim(),
      from: filtrosRascunho.from,
      to: filtrosRascunho.to,
    })
    setPage(0)
    setTentativa((valor) => valor + 1)
  }

  function limparFiltros() {
    setErroFiltro('')
    const filtrosVazios = { eventName: '', organizerName: '', from: '', to: '' }
    setFiltrosRascunho(filtrosVazios)
    setFiltros({})
    setPage(0)
    setSituacao('carregando')
    setTentativa((valor) => valor + 1)
  }

  return (
    <OrganizadorLayout
      perfil="admin"
      titulo="Visão geral"
      apoio="Acompanhe eventos, propostas e valores do planejamento."
    >
      {situacao === 'pronto' && <Indicadores summary={relatorio.summary} />}

      <form className="visao-geral__filtros" onSubmit={aplicarFiltros}>
        <label>
          <span>Evento</span>
          <input
            type="search"
            maxLength={150}
            placeholder="Nome do evento"
            value={filtrosRascunho.eventName}
            onChange={(event) =>
              setFiltrosRascunho({ ...filtrosRascunho, eventName: event.target.value })
            }
          />
        </label>
        <label>
          <span>Organizador</span>
          <input
            type="search"
            maxLength={150}
            placeholder="Nome do organizador"
            value={filtrosRascunho.organizerName}
            onChange={(event) =>
              setFiltrosRascunho({ ...filtrosRascunho, organizerName: event.target.value })
            }
          />
        </label>
        <label>
          <span>De</span>
          <input
            type="date"
            required={Boolean(filtrosRascunho.to)}
            value={filtrosRascunho.from}
            onChange={(event) => {
              if (erroFiltro) setErroFiltro('')
              setFiltrosRascunho({ ...filtrosRascunho, from: event.target.value })
            }}
          />
        </label>
        <label>
          <span>Até</span>
          <input
            type="date"
            required={Boolean(filtrosRascunho.from)}
            value={filtrosRascunho.to}
            onChange={(event) => {
              if (erroFiltro) setErroFiltro('')
              setFiltrosRascunho({ ...filtrosRascunho, to: event.target.value })
            }}
          />
        </label>
        <div className="visao-geral__filtros-acoes">
          <button type="submit" className="botao">
            Aplicar filtros
          </button>
          <button type="button" className="botao botao--secundario" onClick={limparFiltros}>
            Limpar
          </button>
        </div>
        {erroFiltro && (
          <p className="mensagem-erro visao-geral__filtro-erro" role="alert">
            {erroFiltro}
          </p>
        )}
      </form>

      {situacao === 'carregando' && <Carregando mensagem="Carregando relatórios…" />}

      {situacao === 'erro' && <ErroNaTela erro={erro} aoTentarDeNovo={tentarDeNovo} />}

      {situacao === 'pronto' && todosEventos.length === 0 && (
        <Vazio
          titulo="Nenhum evento cadastrado"
          mensagem="Os eventos aparecerão aqui quando forem cadastrados."
        />
      )}

      {situacao === 'pronto' && relatorio.data.length > 0 ? (
        <section className="visao-geral__painel" aria-label="Eventos da plataforma">
          <TabelaEventos eventos={todosEventos} />
        </section>
      ) : (
        situacao === 'pronto' &&
        relatorio.data.length === 0 && (
          <p className="visao-geral__vazio" role="status">
            Nenhum evento encontrado com os filtros informados.
          </p>
        )
      )}

      {situacao === 'pronto' && (relatorio.data.length > 0 || page > 0) && (
        <nav className="visao-geral__paginacao" aria-label="Paginação dos relatórios">
          <button
            type="button"
            className="botao botao--secundario"
            disabled={page === 0}
            onClick={() => {
              setSituacao('carregando')
              setPage((atual) => atual - 1)
            }}
          >
            Anterior
          </button>
          <span>Página {relatorio.page + 1}</span>
          <button
            type="button"
            className="botao botao--secundario"
            disabled={relatorio.is_last_page}
            onClick={() => {
              setSituacao('carregando')
              setPage((atual) => atual + 1)
            }}
          >
            Próxima
          </button>
        </nav>
      )}
    </OrganizadorLayout>
  )
}
