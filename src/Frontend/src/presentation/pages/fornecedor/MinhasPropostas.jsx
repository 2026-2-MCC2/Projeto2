import { useMemo } from 'react'
import { OrganizadorLayout } from '../../components/organizador/OrganizadorLayout.jsx'
import {
  lerPropostasFornecedor,
  PROPOSTAS_FORNECEDOR_INICIAIS,
} from '../../data/propostaFornecedor.js'
import { useIsMobile } from '../../hooks/useIsMobile.js'
import '../../styles/fornecedor.css'

const SITUACOES = ['Enviada', 'Em análise', 'Aceita', 'Recusada']

function formatarValor(valor) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(valor)
}

function CartaoResumo({ rotulo, quantidade }) {
  return (
    <article className="minhas-propostas__indicador">
      <span>{rotulo}</span>
      <strong>{quantidade}</strong>
    </article>
  )
}

function EtiquetaSituacao({ situacao }) {
  const classe = situacao.toLocaleLowerCase('pt-BR').replace(' ', '-')
  return (
    <span className={`minhas-propostas__situacao minhas-propostas__situacao--${classe}`}>
      {situacao}
    </span>
  )
}

function CartaoProposta({ proposta }) {
  return (
    <article
      className={`minhas-propostas__cartao${proposta.ocultarNoMobile ? ' minhas-propostas__cartao--oculto-mobile' : ''}`}
    >
      <div className="minhas-propostas__cartao-cabecalho">
        <h2>{proposta.item}</h2>
        <strong>{formatarValor(proposta.valor)}</strong>
      </div>
      <p>
        {proposta.evento} · enviada em {proposta.enviadaEm}
      </p>
      <EtiquetaSituacao situacao={proposta.situacao} />
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
        <div className="minhas-propostas__linha" role="row" key={proposta.id}>
          <span className="minhas-propostas__item" role="cell">
            {proposta.item}
          </span>
          <span role="cell">{proposta.evento}</span>
          <span role="cell">{formatarValor(proposta.valor)}</span>
          <span role="cell">
            <EtiquetaSituacao situacao={proposta.situacao} />
          </span>
          <span className="minhas-propostas__data" role="cell">
            {proposta.enviadaEm}
          </span>
        </div>
      ))}
    </div>
  )
}

export function MinhasPropostas() {
  const isMobile = useIsMobile()
  const propostas = useMemo(() => lerPropostasFornecedor(), [])
  const propostasNovas = propostas.length - PROPOSTAS_FORNECEDOR_INICIAIS.length
  const totais = { 'Em análise': 2, Aceita: 3, Recusada: 1 }
  const enviadas = 6 + propostasNovas

  return (
    <OrganizadorLayout
      perfil="fornecedor"
      titulo="Minhas propostas"
      apoio="Acompanhe o andamento do que você enviou."
      apoioMobile="Acompanhe o andamento do que você enviou"
    >
      <section className="minhas-propostas" aria-label="Minhas propostas">
        <div className="minhas-propostas__resumo">
          {!isMobile && <CartaoResumo rotulo="Enviadas" quantidade={enviadas} />}
          {SITUACOES.slice(1).map((situacao) => (
            <CartaoResumo
              key={situacao}
              rotulo={
                situacao === 'Aceita' ? 'Aceitas' : situacao === 'Recusada' ? 'Recusadas' : situacao
              }
              quantidade={totais[situacao]}
            />
          ))}
        </div>
        {isMobile ? (
          <div className="minhas-propostas__cartoes">
            {propostas.map((proposta) => (
              <CartaoProposta key={proposta.id} proposta={proposta} />
            ))}
          </div>
        ) : (
          <TabelaPropostas propostas={propostas} />
        )}
      </section>
    </OrganizadorLayout>
  )
}
