import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatarDia, formatarMoeda, formatarPeriodo } from '../../../application/eventos.js'
import { diasAteVencer, listarMinhasPropostas } from '../../../application/propostas.js'
import { Carregando, ErroNaTela, Vazio } from '../../components/comum/EstadoDaTela.jsx'
import { Icone } from '../../components/comum/Icone.jsx'
import { AbasDeFiltro } from '../../components/fornecedor/AbasDeFiltro.jsx'
import { EtiquetaDaProposta } from '../../components/fornecedor/EtiquetaDaProposta.jsx'
import { Botao } from '../../components/organizador/Formulario.jsx'
import { OrganizadorLayout } from '../../components/organizador/OrganizadorLayout.jsx'
import { useIsMobile } from '../../hooks/useIsMobile.js'
import iconeAvancar from '../../assets/organizador/icone-avancar.svg'
import iconeBuscar from '../../assets/organizador/icone-buscar.svg'
import iconeAtencao from '../../assets/organizador/icone-atencao.svg'
import iconeCalendario from '../../assets/fornecedor/icone-calendario.svg'
import iconeLocal from '../../assets/fornecedor/icone-local.svg'
import '../../styles/fornecedor.css'

const POR_PAGINA = 20
const DIAS_PARA_AVISAR = 3

const FILTROS = [
  { chave: 'todas', rotulo: 'Todas', status: undefined, conta: (totais) => totais.all },
  {
    chave: 'aguardando',
    rotulo: 'Aguardando',
    status: 'sent,under_review',
    conta: (totais) => totais.sent + totais.under_review,
  },
  { chave: 'aceitas', rotulo: 'Aceitas', status: 'accepted', conta: (totais) => totais.accepted },
  {
    chave: 'recusadas',
    rotulo: 'Recusadas',
    status: 'rejected',
    conta: (totais) => totais.rejected,
  },
  {
    chave: 'encerradas',
    rotulo: 'Encerradas',
    status: 'canceled',
    conta: (totais) => totais.canceled,
  },
]

const SITUACAO_DO_EVENTO = {
  open_for_quotes: { texto: 'Em cotação', classe: 'aberto' },
  closed: { texto: 'Cotação encerrada', classe: 'encerrado' },
  canceled: { texto: 'Evento cancelado', classe: 'cancelado' },
}

const linkDaProposta = (proposta) => `/fornecedor/propostas/${proposta.proposal_key}`
const semAcento = (texto) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function MinhasPropostas() {
  const isMobile = useIsMobile()
  const [filtro, setFiltro] = useState('todas')
  const [busca, setBusca] = useState('')
  const [tentativa, setTentativa] = useState(0)
  const [estado, setEstado] = useState({ situacao: 'carregando' })
  const [carregandoMais, setCarregandoMais] = useState(false)
  const [erroAoCarregarMais, setErroAoCarregarMais] = useState('')
  const status = FILTROS.find((opcao) => opcao.chave === filtro).status

  useEffect(() => {
    let telaAberta = true
    listarMinhasPropostas({ status, limit: POR_PAGINA })
      .then((pagina) => {
        if (!telaAberta) return
        setEstado({
          situacao: 'pronto',
          status,
          propostas: pagina.data,
          temMais: !pagina.is_last_page,
          proximaPagina: pagina.next_cursor,
          totais: pagina.counts,
        })
      })
      .catch((erro) => {
        if (telaAberta) setEstado({ situacao: 'erro', erro })
      })

    return () => {
      telaAberta = false
    }
  }, [status, tentativa])

  function mudarFiltro(chave) {
    setFiltro(chave)
    setErroAoCarregarMais('')
  }

  async function carregarMais() {
    setCarregandoMais(true)
    setErroAoCarregarMais('')
    try {
      const pagina = await listarMinhasPropostas({
        status,
        limit: POR_PAGINA,
        depoisDe: estado.proximaPagina,
      })
      // a página de outro filtro chega atrasada se a aba mudou no meio do pedido
      setEstado((atual) =>
        atual.status !== status
          ? atual
          : {
              ...atual,
              propostas: [...atual.propostas, ...pagina.data],
              temMais: !pagina.is_last_page,
              proximaPagina: pagina.next_cursor,
            },
      )
    } catch (falha) {
      setErroAoCarregarMais(falha.message)
    } finally {
      setCarregandoMais(false)
    }
  }

  const semNenhuma = estado.situacao === 'pronto' && estado.totais.all === 0
  const listaDoFiltro = estado.situacao === 'pronto' && estado.status === status
  const termo = semAcento(busca.trim())
  const visiveis = listaDoFiltro
    ? estado.propostas.filter(
        (proposta) =>
          !termo ||
          semAcento(`${proposta.item.description} ${proposta.event.name}`).includes(termo),
      )
    : []
  const prestesAVencer = visiveis.find(venceEmBreve)

  return (
    <OrganizadorLayout
      perfil="fornecedor"
      titulo="Minhas propostas"
      apoio="Acompanhe o que você enviou, agrupado por evento."
      apoioMobile="Acompanhe o que você enviou"
    >
      {estado.situacao === 'carregando' && <Carregando mensagem="Carregando suas propostas…" />}

      {estado.situacao === 'erro' && (
        <ErroNaTela
          erro={estado.erro}
          aoTentarDeNovo={() => {
            setEstado({ situacao: 'carregando' })
            setTentativa((valor) => valor + 1)
          }}
        />
      )}

      {semNenhuma && (
        <Vazio
          icone="propostas"
          titulo="Você ainda não enviou propostas"
          mensagem="Escolha um evento aberto para cotação e envie a sua proposta para um item."
        >
          <Link to="/fornecedor/eventos" className="botao botao--secundario">
            Ver eventos disponíveis
          </Link>
        </Vazio>
      )}

      {estado.situacao === 'pronto' && !semNenhuma && (
        <section className="minhas-propostas" aria-label="Minhas propostas">
          <div className="minhas-propostas__filtros">
            <AbasDeFiltro
              rotulo="Filtrar por situação"
              ativa={filtro}
              aoMudar={mudarFiltro}
              abas={FILTROS.map((opcao) => ({ ...opcao, quantidade: opcao.conta(estado.totais) }))}
            />
            <label className="minhas-propostas__busca">
              <Icone src={iconeBuscar} />
              <input
                type="search"
                aria-label="Buscar por item ou evento"
                value={busca}
                onChange={(evento) => setBusca(evento.target.value)}
                placeholder="Buscar por item ou evento"
              />
            </label>
          </div>

          {prestesAVencer && <AvisoDeValidade proposta={prestesAVencer} curto={isMobile} />}

          {!listaDoFiltro ? (
            <Carregando mensagem="Carregando suas propostas…" />
          ) : visiveis.length === 0 ? (
            <p className="minhas-propostas__vazio">{mensagemSemResultado(termo, estado.temMais)}</p>
          ) : (
            agruparPorEvento(visiveis).map((grupo) => (
              <GrupoDoEvento key={grupo.evento.event_key} grupo={grupo} />
            ))
          )}

          {erroAoCarregarMais && (
            <p className="mensagem-erro" role="alert">
              {erroAoCarregarMais}
            </p>
          )}
          {listaDoFiltro && estado.temMais && (
            <Botao type="button" secundario onClick={carregarMais} disabled={carregandoMais}>
              {carregandoMais ? 'Carregando...' : 'Carregar mais propostas'}
            </Botao>
          )}
        </section>
      )}
    </OrganizadorLayout>
  )
}

function mensagemSemResultado(termo, temMais) {
  if (!termo) return 'Nenhuma proposta nesta situação.'
  return temMais
    ? 'Nenhuma proposta encontrada entre as carregadas. Carregue mais para buscar nas outras.'
    : 'Nenhuma proposta encontrada com essa busca.'
}

const podeVencer = (proposta) =>
  proposta.status === 'sent' && proposta.event.status === 'open_for_quotes'

function venceEmBreve(proposta) {
  const dias = diasAteVencer(proposta.valid_until)
  return podeVencer(proposta) && dias >= 0 && dias <= DIAS_PARA_AVISAR
}

const jaVenceu = (proposta) => podeVencer(proposta) && diasAteVencer(proposta.valid_until) < 0

function agruparPorEvento(propostas) {
  const grupos = new Map()
  for (const proposta of propostas) {
    const chave = proposta.event.event_key
    if (!grupos.has(chave)) grupos.set(chave, { evento: proposta.event, propostas: [] })
    grupos.get(chave).propostas.push(proposta)
  }
  return [...grupos.values()]
}

function textoDosDias(dias) {
  if (dias === 0) return 'vence hoje'
  return dias === 1 ? 'vence amanhã' : `vence em ${dias} dias`
}

function AvisoDeValidade({ proposta, curto }) {
  const vence = textoDosDias(diasAteVencer(proposta.valid_until))

  return (
    <p className="aviso aviso--alerta minhas-propostas__aviso" role="note">
      <Icone src={iconeAtencao} />
      <span>
        {proposta.item.description} {vence}.
        {!curto && ' Se precisar, edite a validade antes de o organizador decidir.'}
      </span>
      <Link to={linkDaProposta(proposta)} className="link-com-seta">
        Ver proposta
        <Icone src={iconeAvancar} />
      </Link>
    </p>
  )
}

function GrupoDoEvento({ grupo }) {
  const { evento, propostas } = grupo
  const situacao = SITUACAO_DO_EVENTO[evento.status]

  return (
    <article className="grupo-do-evento">
      <header className="grupo-do-evento__cabecalho">
        <div className="grupo-do-evento__titulos">
          <h2>{evento.name}</h2>
          <p>
            <span>
              <Icone src={iconeCalendario} />
              {formatarPeriodo(evento.start_date, evento.end_date)}
            </span>
            <span>
              <Icone src={iconeLocal} />
              {evento.venue_name} · {evento.city}
            </span>
          </p>
        </div>
        {situacao && (
          <span
            className={`grupo-do-evento__situacao grupo-do-evento__situacao--${situacao.classe}`}
          >
            {situacao.texto}
          </span>
        )}
        {evento.status === 'open_for_quotes' && (
          <Link to={`/fornecedor/eventos/${evento.event_key}`} className="link-com-seta">
            Ver evento
            <Icone src={iconeAvancar} />
          </Link>
        )}
      </header>

      <ul className="grupo-do-evento__propostas">
        {propostas.map((proposta) => (
          <LinhaDaProposta key={proposta.proposal_key} proposta={proposta} />
        ))}
      </ul>
    </article>
  )
}

function quandoDaProposta(proposta) {
  if (jaVenceu(proposta)) return { texto: 'validade vencida', alerta: true }
  if (venceEmBreve(proposta)) {
    return { texto: textoDosDias(diasAteVencer(proposta.valid_until)), alerta: true }
  }
  return { texto: `enviada em ${formatarDia(proposta.sent_at)}`, alerta: false }
}

function LinhaDaProposta({ proposta }) {
  const quando = quandoDaProposta(proposta)

  return (
    <li>
      <Link to={linkDaProposta(proposta)} className="linha-da-proposta">
        <span className="linha-da-proposta__item">
          <strong>{proposta.item.description}</strong>
          <small>{proposta.item.category}</small>
        </span>
        <span
          className={`linha-da-proposta__quando${quando.alerta ? ' linha-da-proposta__quando--alerta' : ''}`}
        >
          {quando.texto}
        </span>
        <strong className="linha-da-proposta__valor">{formatarMoeda(proposta.amount)}</strong>
        <span className="linha-da-proposta__situacao">
          <EtiquetaDaProposta status={proposta.status} />
        </span>
        <Icone src={iconeAvancar} className="linha-da-proposta__seta" />
      </Link>
    </li>
  )
}
