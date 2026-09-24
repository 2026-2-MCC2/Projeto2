import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { EventoLayout } from '../../components/organizador/EventoLayout.jsx'
import { Cartao, ListaDeLinhas } from '../../components/organizador/Cartao.jsx'
import { Botao } from '../../components/organizador/Formulario.jsx'
import { Modal } from '../../components/comum/Modal.jsx'
import { useIsMobile } from '../../hooks/useIsMobile.js'
import { buscarEvento } from '../../data/eventos.js'
import iconePublicar from '../../assets/comum/icone-enviar.svg'
import iconeConcluida from '../../assets/organizador/icone-concluido-verde.svg'
import iconeAtual from '../../assets/organizador/icone-etapa-atual.svg'
import iconeFutura from '../../assets/organizador/icone-etapa-futura.svg'

const ICONE_DA_ETAPA = {
  concluida: iconeConcluida,
  atual: iconeAtual,
  futura: iconeFutura,
}

export function EventoVisaoGeral() {
  const { id } = useParams()
  const isMobile = useIsMobile()
  const [publicando, setPublicando] = useState(false)
  const detalhe = buscarEvento(id)?.detalhe

  if (!detalhe) return <EventoLayout />

  const acoes = (
    <>
      <Botao type="button" secundario>
        Editar evento
      </Botao>
      <Botao type="button" onClick={() => setPublicando(true)}>
        Publicar para cotação
      </Botao>
    </>
  )

  const modalDePublicacao = publicando && (
    <Modal
      icone={iconePublicar}
      titulo="Publicar evento para cotação?"
      mensagem="O evento e seus itens abertos ficarão visíveis para os fornecedores aprovados nas categorias escolhidas. Você ainda pode editar o evento depois."
      dados={[
        { rotulo: 'Evento', valor: 'Festival Primavera Som & Luz' },
        { rotulo: 'Itens abertos', valor: '4 itens' },
        { rotulo: 'Prazo para propostas', valor: '25 Set 2026' },
      ]}
      acao={{ cancelar: 'Cancelar', confirmar: 'Publicar evento' }}
      aoFechar={() => setPublicando(false)}
    />
  )

  const dadosDoEvento = (
    <Cartao titulo="Dados do evento">
      <div className="ficha">
        {(isMobile ? detalhe.dadosMobile : detalhe.dados).map((dado) => (
          <div key={dado.rotulo} className="ficha__dado">
            <span>{dado.rotulo}</span>
            <strong>{dado.valor}</strong>
          </div>
        ))}
      </div>
    </Cartao>
  )

  const orcamento = (
    <Cartao
      titulo={isMobile ? 'Orçamento' : 'Orçamento do evento'}
      link={{ para: `/organizador/eventos/${id}/itens`, nome: isMobile ? 'Ver itens' : 'Ver itens de custo' }}
    >
      <div className="indicadores">
        <Indicador rotulo={isMobile ? 'CONSOLIDADO' : 'CUSTO CONSOLIDADO'} valor={detalhe.orcamento.consolidado} />
        <Indicador rotulo={isMobile ? 'PREVISTO' : 'ORÇAMENTO PREVISTO'} valor={detalhe.orcamento.previsto} />
        <Indicador
          rotulo={isMobile ? 'ECONOMIA' : 'ECONOMIA NAS COTAÇÕES'}
          valor={detalhe.orcamento.economia}
          positivo
        />
      </div>

      <div className="progresso-orcamento">
        <span style={{ width: `${detalhe.orcamento.comprometido}%` }} />
      </div>

      <p className="cartao__apoio">
        {detalhe.orcamento.comprometido}% do orçamento previsto {isMobile ? 'comprometido' : 'já está comprometido'}
      </p>
    </Cartao>
  )

  const itensDeCusto = (
    <Cartao
      titulo="Itens de custo"
      link={{
        para: `/organizador/eventos/${id}/itens`,
        nome: isMobile ? 'Ver todos' : `Ver todos os ${detalhe.totalDeItens} itens`,
      }}
    >
      <ListaDeLinhas
        compacta={isMobile}
        linhas={detalhe.itens.map((item) => ({
          chave: item.nome,
          titulo: item.nome,
          apoio: isMobile ? undefined : item.categoria,
          etiqueta: item.situacao === 'aceita' ? (isMobile ? 'Aceita' : 'Proposta aceita') : 'Em cotação',
          estiloDaEtiqueta: item.situacao === 'aceita' ? 'aprovado' : 'cotacao',
          valor: item.valor,
        }))}
      />
    </Cartao>
  )

  const propostas = (
    <Cartao
      titulo="Propostas recebidas"
      link={{ para: `/organizador/eventos/${id}/propostas`, nome: isMobile ? 'Comparar' : 'Comparar propostas' }}
    >
      <ListaDeLinhas
        linhas={(isMobile ? detalhe.propostas.slice(0, 2) : detalhe.propostas).map((proposta) => ({
          chave: proposta.fornecedor,
          titulo: proposta.fornecedor,
          apoio: isMobile ? undefined : proposta.item,
          etiqueta: isMobile ? undefined : proposta.etiqueta,
          estiloDaEtiqueta: 'aprovado',
          valor: proposta.valor,
        }))}
      />
    </Cartao>
  )

  const ticket = (
    <Cartao titulo="Ticket estimado" etiqueta={detalhe.ticketEstimado.cenario}>
      <strong className="ticket__valor">{detalhe.ticketEstimado.valor}</strong>
      <p className="cartao__apoio">{detalhe.ticketEstimado.explicacao}</p>

      <div className="cartao__divisor" />

      <div className="cenarios">
        {detalhe.ticketEstimado.cenarios.map((cenario) => (
          <div key={cenario.nome} className="cenario">
            <span className="cenario__nome">{cenario.nome}</span>
            <strong className={cenario.destaque ? 'cenario__valor cenario__valor--destaque' : 'cenario__valor'}>
              {cenario.valor}
            </strong>
            <small>{cenario.publico}</small>
          </div>
        ))}
      </div>

      <Link to={`/organizador/eventos/${id}/ticket`} className="cartao__link">
        Ver cálculo completo
      </Link>
    </Cartao>
  )

  if (isMobile) {
    return (
      <EventoLayout>
        {dadosDoEvento}
        {orcamento}
        {itensDeCusto}
        {propostas}
        {ticket}
        {modalDePublicacao}
      </EventoLayout>
    )
  }

  return (
    <EventoLayout acoes={acoes} comResumo>
      <div className="colunas">
        <div className="colunas__principal">
          {dadosDoEvento}
          {orcamento}
          {itensDeCusto}
          {propostas}
        </div>

        <div className="colunas__lateral">
          {ticket}

          <Cartao titulo="Andamento do planejamento">
            <div className="andamento">
              {detalhe.andamento.map((etapa) => (
                <div key={etapa.nome} className={`andamento__etapa andamento__etapa--${etapa.situacao}`}>
                  <img src={ICONE_DA_ETAPA[etapa.situacao]} alt="" />
                  {etapa.nome}
                </div>
              ))}
            </div>
          </Cartao>
        </div>
      </div>

      {modalDePublicacao}
    </EventoLayout>
  )
}

function Indicador({ rotulo, valor, positivo = false }) {
  return (
    <div className="indicador">
      <span>{rotulo}</span>
      <strong className={positivo ? 'indicador__valor--positivo' : undefined}>{valor}</strong>
    </div>
  )
}
