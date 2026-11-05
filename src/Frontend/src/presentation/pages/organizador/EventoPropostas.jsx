// Aba Propostas do evento: as propostas do item escolhido lado a lado, com a de menor valor em
// destaque, e a tabela dos itens em cotação embaixo (clicar numa linha troca o item mostrado).

import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { formatarMoeda } from '../../../application/eventos.js'
import {
  aceitarPropostaDoEvento,
  buscarComparacaoDePropostas,
  formatarValidade,
  itemJaDecidido,
  menorPropostaDisponivel,
} from '../../../application/propostas.js'
import { Carregando, ErroNaTela, Vazio } from '../../components/comum/EstadoDaTela.jsx'
import { EventoLayout } from '../../components/organizador/EventoLayout.jsx'
import { ModalSelecionarProposta } from '../../components/organizador/ModalSelecionarProposta.jsx'
import { toast } from '../../toasts.js'

export function EventoPropostas() {
  const { id } = useParams()
  const [resultado, setResultado] = useState({ event_key: null, items: [], error: null })
  const [tentativa, setTentativa] = useState(0)
  const [itemEscolhido, setItemEscolhido] = useState(null)
  const [selecionando, setSelecionando] = useState(null)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    let telaAberta = true
    buscarComparacaoDePropostas(id)
      .then((resposta) => {
        if (telaAberta) setResultado({ ...resposta, error: null })
      })
      .catch((error) => {
        if (telaAberta) setResultado({ event_key: id, items: [], error })
      })
    return () => {
      telaAberta = false
    }
  }, [id, tentativa])

  const carregando = resultado.event_key !== id
  const itens = resultado.items ?? []

  if (carregando) {
    return (
      <EventoLayout>
        <Carregando mensagem="Carregando propostas do evento…" />
      </EventoLayout>
    )
  }

  if (resultado.error) {
    return (
      <EventoLayout>
        <ErroNaTela erro={resultado.error} aoTentarDeNovo={() => setTentativa((v) => v + 1)} />
      </EventoLayout>
    )
  }

  const comPropostas = itens.filter((item) => item.proposals.length > 0)
  if (comPropostas.length === 0) {
    return (
      <EventoLayout>
        <Vazio
          icone="propostas"
          titulo="Nenhuma proposta ainda"
          mensagem="As propostas aparecem aqui quando os fornecedores responderem aos itens em cotação."
        />
      </EventoLayout>
    )
  }

  // começa pelo primeiro item ainda sem escolha; se todos já foram decididos, pelo primeiro com proposta
  const item =
    itens.find((candidato) => candidato.item_key === itemEscolhido) ??
    comPropostas.find((candidato) => !itemJaDecidido(candidato)) ??
    comPropostas[0]

  async function confirmarSelecao() {
    setSalvando(true)
    try {
      const atualizada = await aceitarPropostaDoEvento(id, selecionando.proposal_key)
      setResultado({ ...atualizada, error: null })
      toast.sucesso('Proposta selecionada', { descricao: selecionando.supplier_name })
      setSelecionando(null)
    } catch (falha) {
      toast.erro('Não foi possível selecionar a proposta', { descricao: falha.message })
      if (falha.status === 409) setTentativa((v) => v + 1)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <EventoLayout>
      <div className="propostas-do-item">
        <PropostasDoItem
          eventKey={id}
          item={item}
          aoSelecionar={(proposta) => setSelecionando(proposta)}
        />
        <ItensEmCotacao
          itens={itens}
          itemAtual={item}
          aoEscolher={(chave) => setItemEscolhido(chave)}
        />
      </div>

      {selecionando && (
        <ModalSelecionarProposta
          proposta={selecionando}
          item={item}
          salvando={salvando}
          aoConfirmar={confirmarSelecao}
          aoFechar={() => setSelecionando(null)}
        />
      )}
    </EventoLayout>
  )
}

function PropostasDoItem({ eventKey, item, aoSelecionar }) {
  const menor = menorPropostaDisponivel(item)
  const decidido = itemJaDecidido(item)
  const apoio = [
    item.category,
    item.estimated_value != null && `orçamento previsto ${formatarMoeda(item.estimated_value)}`,
    `${item.proposals.length} ${item.proposals.length === 1 ? 'proposta' : 'propostas'}`,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <section aria-labelledby="item-das-propostas">
      <header className="propostas-do-item__cabecalho">
        <h2 id="item-das-propostas">{item.description}</h2>
        <p>{apoio}</p>
      </header>

      {item.proposals.length === 0 ? (
        <Vazio
          icone="propostas"
          titulo="Este item ainda não recebeu propostas"
          mensagem="Escolha outro item na tabela abaixo."
        />
      ) : (
        <div className="propostas-do-item__grade">
          {item.proposals.map((proposta) => (
            <CartaoDeProposta
              key={proposta.proposal_key}
              eventKey={eventKey}
              proposta={proposta}
              destaque={!decidido && proposta.proposal_key === menor?.proposal_key}
              podeSelecionar={!decidido && !proposta.is_expired && proposta.status === 'sent'}
              aoSelecionar={() => aoSelecionar(proposta)}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function CartaoDeProposta({ eventKey, proposta, destaque, podeSelecionar, aoSelecionar }) {
  const rota = `/organizador/eventos/${eventKey}/propostas/${proposta.proposal_key}`

  return (
    <article className={`cartao-proposta${destaque ? ' cartao-proposta--destaque' : ''}`}>
      <div className="cartao-proposta__etiquetas">
        {destaque && <span className="etiqueta etiqueta--aprovado">Menor valor</span>}
        {proposta.status === 'accepted' && (
          <span className="etiqueta etiqueta--aprovado">Selecionada</span>
        )}
        {proposta.status === 'rejected' && (
          <span className="etiqueta etiqueta--rejeitado">Recusada</span>
        )}
        {proposta.is_expired && <span className="etiqueta etiqueta--vencida">Vencida</span>}
      </div>

      <Link to={rota} className="cartao-proposta__fornecedor" viewTransition>
        {proposta.supplier_name}
      </Link>
      <strong className="cartao-proposta__valor">{formatarMoeda(proposta.amount)}</strong>

      <dl className="cartao-proposta__dados">
        <div>
          <dt>Prazo de entrega</dt>
          <dd>{proposta.delivery_terms}</dd>
        </div>
        <div>
          <dt>Validade da proposta</dt>
          <dd>{formatarValidade(proposta.valid_until)}</dd>
        </div>
      </dl>

      {podeSelecionar ? (
        <button
          type="button"
          className={destaque ? 'botao' : 'botao botao--secundario'}
          onClick={aoSelecionar}
        >
          {destaque ? 'Selecionar proposta' : 'Selecionar'}
        </button>
      ) : (
        <Link to={rota} className="botao botao--secundario" viewTransition>
          Ver proposta
        </Link>
      )}
    </article>
  )
}

function situacaoDoItem(item) {
  if (itemJaDecidido(item)) return { nome: 'Selecionada', estilo: 'aprovado' }
  if (item.proposals.length === 0) return { nome: 'Sem propostas', estilo: 'neutro' }
  return { nome: 'Em análise', estilo: 'cotacao' }
}

function ItensEmCotacao({ itens, itemAtual, aoEscolher }) {
  return (
    <section className="itens-cotacao" aria-label="Itens em cotação">
      <div className="itens-cotacao__linha itens-cotacao__linha--cabecalho" aria-hidden="true">
        <span>Itens em cotação</span>
        <span>Propostas</span>
        <span>Menor valor</span>
        <span>Situação</span>
      </div>
      {itens.map((item) => {
        const menor = menorPropostaDisponivel(item)
        const situacao = situacaoDoItem(item)
        const atual = item.item_key === itemAtual.item_key
        return (
          <button
            key={item.item_key}
            type="button"
            className={`itens-cotacao__linha${atual ? ' itens-cotacao__linha--atual' : ''}`}
            aria-pressed={atual}
            onClick={() => aoEscolher(item.item_key)}
          >
            <strong>{item.description}</strong>
            <span>{item.proposals.length}</span>
            <span>{menor ? formatarMoeda(menor.amount) : '—'}</span>
            <span className={`itens-cotacao__situacao itens-cotacao__situacao--${situacao.estilo}`}>
              {situacao.nome}
            </span>
          </button>
        )
      })}
    </section>
  )
}
