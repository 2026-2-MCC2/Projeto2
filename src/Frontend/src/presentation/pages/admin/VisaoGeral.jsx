import { useEffect, useState } from 'react'
import { OrganizadorLayout } from '../../components/organizador/OrganizadorLayout.jsx'
import { Carregando, ErroNaTela, Vazio } from '../../components/comum/EstadoDaTela.jsx'
import { Icone } from '../../components/comum/Icone.jsx'
import { buscarRelatorioAdmin } from '../../../infrastructure/relatoriosAdmin.js'
import iconeBuscar from '../../assets/organizador/icone-buscar.svg'
import '../../styles/admin.css'

const COLUNAS = [
  { chave: 'nome', rotulo: 'Evento' },
  { chave: 'organizador', rotulo: 'Organizador' },
  { chave: 'situacao', rotulo: 'Situação' },
  { chave: 'custos', rotulo: 'Custo consolidado' },
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
      Number(evento.values.selected_proposals_total) + Number(evento.values.internal_cost_total),
    ),
    propostas: String(evento.proposal_count),
    ticket: '—',
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
  const [busca, setBusca] = useState('')
  const [situacao, setSituacao] = useState('carregando')
  const [relatorio, setRelatorio] = useState(null)
  const [erro, setErro] = useState(null)
  const [tentativa, setTentativa] = useState(0)

  useEffect(() => {
    let telaAberta = true

    buscarRelatorioAdmin()
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
  }, [tentativa])

  function tentarDeNovo() {
    setErro(null)
    setSituacao('carregando')
    setTentativa((valor) => valor + 1)
  }

  const termo = busca.trim().toLocaleLowerCase('pt-BR')
  const todosEventos = relatorio ? mapearEventos(relatorio.data) : []
  const eventos = todosEventos.filter((evento) =>
    `${evento.nome} ${evento.organizador}`.toLocaleLowerCase('pt-BR').includes(termo),
  )

  return (
    <OrganizadorLayout
      perfil="admin"
      titulo="Visão geral"
      apoio="Acompanhe eventos, propostas e valores do planejamento."
    >
      {situacao === 'pronto' && <Indicadores summary={relatorio.summary} />}

      {situacao === 'pronto' && (
        <label className="visao-geral__busca">
          <Icone src={iconeBuscar} />
          <input
            type="search"
            aria-label="Buscar evento ou organizador"
            placeholder="Buscar evento ou organizador"
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
          />
        </label>
      )}

      {situacao === 'carregando' && <Carregando mensagem="Carregando relatórios…" />}

      {situacao === 'erro' && <ErroNaTela erro={erro} aoTentarDeNovo={tentarDeNovo} />}

      {situacao === 'pronto' && todosEventos.length === 0 && (
        <Vazio
          titulo="Nenhum evento cadastrado"
          mensagem="Os eventos aparecerão aqui quando forem cadastrados."
        />
      )}

      {situacao === 'pronto' && todosEventos.length > 0 && eventos.length > 0 ? (
        <section className="visao-geral__painel" aria-label="Eventos da plataforma">
          <TabelaEventos eventos={eventos} />
        </section>
      ) : (
        situacao === 'pronto' &&
        todosEventos.length > 0 && (
          <p className="visao-geral__vazio" role="status">
            Nenhum evento encontrado para essa busca.
          </p>
        )
      )}
    </OrganizadorLayout>
  )
}
