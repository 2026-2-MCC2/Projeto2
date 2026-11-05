import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatarMoeda } from '../../../application/eventos.js'
import { listarMinhasPropostas } from '../../../application/propostas.js'
import { formatarData } from '../../../domain/formatacao.js'
import { Carregando, ErroNaTela, Vazio } from '../../components/comum/EstadoDaTela.jsx'
import { EtiquetaDaProposta } from '../../components/fornecedor/EtiquetaDaProposta.jsx'
import { Botao } from '../../components/organizador/Formulario.jsx'
import { OrganizadorLayout } from '../../components/organizador/OrganizadorLayout.jsx'
import { useIsMobile } from '../../hooks/useIsMobile.js'
import '../../styles/fornecedor.css'

const POR_PAGINA = 20

// cartões do topo: rótulo e a chave em counts, que vem junto com a lista
const INDICADORES = [
  { chave: 'all', rotulo: 'Enviadas', somenteDesktop: true },
  { chave: 'accepted', rotulo: 'Aceitas' },
  { chave: 'rejected', rotulo: 'Recusadas' },
  { chave: 'canceled', rotulo: 'Canceladas' },
]

const linkDaProposta = (proposta) => `/fornecedor/propostas/${proposta.proposal_key}`

function CartaoResumo({ rotulo, quantidade }) {
  return (
    <article className="minhas-propostas__indicador">
      <span>{rotulo}</span>
      <strong>{quantidade}</strong>
    </article>
  )
}

function CartaoProposta({ proposta }) {
  return (
    <article className="minhas-propostas__cartao">
      <div className="minhas-propostas__cartao-cabecalho">
        <h2>
          <Link to={linkDaProposta(proposta)} className="minhas-propostas__link">
            {proposta.item.description}
          </Link>
        </h2>
        <strong>{formatarMoeda(proposta.amount)}</strong>
      </div>
      <p>
        {proposta.event.name} · enviada em {formatarData(proposta.sent_at)}
      </p>
      <EtiquetaDaProposta status={proposta.status} />
    </article>
  )
}

function TabelaPropostas({ propostas }) {
  return (
    <div className="minhas-propostas__tabela" role="table" aria-label="Propostas enviadas">
      <div className="minhas-propostas__linha minhas-propostas__linha--cabecalho" role="row">
        {['ITEM', 'EVENTO', 'VALOR', 'SITUAÇÃO', 'ENVIADA EM'].map((coluna) => (
          <span key={coluna} role="columnheader">
            {coluna}
          </span>
        ))}
      </div>
      {propostas.map((proposta) => (
        <div className="minhas-propostas__linha" role="row" key={proposta.proposal_key}>
          <span className="minhas-propostas__item" role="cell">
            <Link to={linkDaProposta(proposta)} className="minhas-propostas__link">
              {proposta.item.description}
            </Link>
          </span>
          <span role="cell">{proposta.event.name}</span>
          <span role="cell">{formatarMoeda(proposta.amount)}</span>
          <span role="cell">
            <EtiquetaDaProposta status={proposta.status} />
          </span>
          <span className="minhas-propostas__data" role="cell">
            {formatarData(proposta.sent_at)}
          </span>
        </div>
      ))}
    </div>
  )
}

// Histórico das propostas do fornecedor (GET /supplier/proposals), da mais recente para a mais antiga.
export function MinhasPropostas() {
  const isMobile = useIsMobile()
  const [tentativa, setTentativa] = useState(0)
  // situacao: 'carregando' | 'erro' | 'pronto'
  const [estado, setEstado] = useState({ situacao: 'carregando' })
  const [carregandoMais, setCarregandoMais] = useState(false)
  const [erroAoCarregarMais, setErroAoCarregarMais] = useState('')

  useEffect(() => {
    let telaAberta = true
    listarMinhasPropostas({ limit: POR_PAGINA })
      .then((pagina) => {
        if (!telaAberta) return
        setEstado({
          situacao: 'pronto',
          propostas: pagina.data,
          temMais: !pagina.is_last_page,
          totais: pagina.counts,
        })
      })
      .catch((erro) => {
        if (telaAberta) setEstado({ situacao: 'erro', erro })
      })

    return () => {
      telaAberta = false
    }
  }, [tentativa])

  function tentarDeNovo() {
    setEstado({ situacao: 'carregando' })
    setTentativa((valor) => valor + 1)
  }

  async function carregarMais() {
    setCarregandoMais(true)
    setErroAoCarregarMais('')
    try {
      const ultimaMostrada = estado.propostas.at(-1)
      const pagina = await listarMinhasPropostas({
        limit: POR_PAGINA,
        depoisDe: ultimaMostrada.proposal_key,
      })
      setEstado((atual) => ({
        ...atual,
        propostas: [...atual.propostas, ...pagina.data],
        temMais: !pagina.is_last_page,
      }))
    } catch (falha) {
      setErroAoCarregarMais(falha.message)
    } finally {
      setCarregandoMais(false)
    }
  }

  return (
    <OrganizadorLayout
      perfil="fornecedor"
      titulo="Minhas propostas"
      apoio="Acompanhe o andamento do que você enviou."
      apoioMobile="Acompanhe o andamento do que você enviou"
    >
      {estado.situacao === 'carregando' && <Carregando mensagem="Carregando suas propostas…" />}

      {estado.situacao === 'erro' && (
        <ErroNaTela erro={estado.erro} aoTentarDeNovo={tentarDeNovo} />
      )}

      {estado.situacao === 'pronto' && estado.propostas.length === 0 && (
        <Vazio
          titulo="Você ainda não enviou propostas"
          mensagem="Escolha um evento aberto para cotação e envie a sua proposta para um item."
        >
          <Link to="/fornecedor/eventos" className="botao botao--secundario">
            Ver eventos disponíveis
          </Link>
        </Vazio>
      )}

      {estado.situacao === 'pronto' && estado.propostas.length > 0 && (
        <section className="minhas-propostas" aria-label="Minhas propostas">
          <div className="minhas-propostas__resumo">
            {INDICADORES.filter((indicador) => !(isMobile && indicador.somenteDesktop)).map(
              (indicador) => (
                <CartaoResumo
                  key={indicador.chave}
                  rotulo={indicador.rotulo}
                  quantidade={estado.totais[indicador.chave]}
                />
              ),
            )}
          </div>

          {isMobile ? (
            <div className="minhas-propostas__cartoes">
              {estado.propostas.map((proposta) => (
                <CartaoProposta key={proposta.proposal_key} proposta={proposta} />
              ))}
            </div>
          ) : (
            <TabelaPropostas propostas={estado.propostas} />
          )}

          {erroAoCarregarMais && (
            <p className="mensagem-erro" role="alert">
              {erroAoCarregarMais}
            </p>
          )}
          {estado.temMais && (
            <Botao type="button" secundario onClick={carregarMais} disabled={carregandoMais}>
              {carregandoMais ? 'Carregando...' : 'Carregar mais propostas'}
            </Botao>
          )}
        </section>
      )}
    </OrganizadorLayout>
  )
}
