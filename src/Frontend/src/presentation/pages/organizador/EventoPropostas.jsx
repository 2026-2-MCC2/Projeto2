import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { formatarMoeda } from '../../../domain/formatacao.js'
import {
  aceitarPropostaDoEvento,
  buscarComparacaoDePropostas,
  formatarValidade,
  itemJaDecidido,
  menorPropostaDisponivel,
  podeSerSelecionada,
  propostaEscolhida,
} from '../../../application/propostas.js'
import { Carregando, ErroNaTela, Vazio } from '../../components/comum/EstadoDaTela.jsx'
import { EventoLayout } from '../../components/organizador/EventoLayout.jsx'
import { ModalSelecionarProposta } from '../../components/organizador/ModalSelecionarProposta.jsx'
import { Icone } from '../../components/comum/Icone.jsx'
import { useEvento } from '../../hooks/useEvento.js'
import { useIsMobile } from '../../hooks/useIsMobile.js'
import { toast } from '../../toasts.js'
import iconeCards from '../../assets/organizador/icone-cards.svg'
import iconeLista from '../../assets/organizador/icone-lista.svg'

export function EventoPropostas() {
  const { id } = useParams()
  const [resultado, setResultado] = useState({ event_key: null, items: [], error: null })
  const [tentativa, setTentativa] = useState(0)
  const [itemEscolhido, setItemEscolhido] = useState(null)
  const [selecionando, setSelecionando] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [visao, setVisao] = useState('cards')
  const isMobile = useIsMobile()
  const { evento } = useEvento(id)
  const eventoEmCotacao = evento?.statusReal === 'open_for_quotes'
  // no celular é sempre cards; em cards os itens viram abas em cima, na lista a tabela fica embaixo
  const emLista = !isMobile && visao === 'lista'

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

  // começa pelo primeiro item que ainda espera uma escolha possível; senão, pelo primeiro com proposta
  const item =
    itens.find((candidato) => candidato.item_key === itemEscolhido) ??
    comPropostas.find(
      (candidato) => !itemJaDecidido(candidato) && menorPropostaDisponivel(candidato),
    ) ??
    comPropostas[0]

  async function confirmarSelecao() {
    setSalvando(true)
    try {
      const atualizada = await aceitarPropostaDoEvento(id, selecionando.proposal_key)
      // continua no item que acabou de ser decidido, em vez de pular para o próximo sem escolha
      setItemEscolhido(item.item_key)
      setResultado({ ...atualizada, error: null })
      toast.sucesso('Proposta selecionada', {
        descricao: `${selecionando.supplier_name} · custo consolidado ${formatarMoeda(atualizada.total_cost)}`,
      })
      setSelecionando(null)
    } catch (falha) {
      toast.erro('Não foi possível selecionar a proposta', { descricao: falha.message })
      // 409: a proposta mudou (retirada, vencida, evento fora de cotação); o modal não fica com a velha
      if (falha.status === 409) {
        setSelecionando(null)
        setTentativa((v) => v + 1)
      }
    } finally {
      setSalvando(false)
    }
  }

  const custoConsolidado = (
    <p className="propostas-consolidado">
      Custo consolidado do evento <strong>{formatarMoeda(resultado.total_cost)}</strong>
    </p>
  )

  return (
    <EventoLayout acoes={custoConsolidado}>
      <div className="propostas-do-item">
        {!emLista && <AbasDosItens itens={itens} itemAtual={item} aoEscolher={setItemEscolhido} />}
        <PropostasDoItem
          eventKey={id}
          item={item}
          emLista={emLista}
          isMobile={isMobile}
          eventoEmCotacao={eventoEmCotacao}
          visao={visao}
          aoTrocarVisao={setVisao}
          aoSelecionar={(proposta) => setSelecionando(proposta)}
        />
        {emLista && <ItensEmCotacao itens={itens} itemAtual={item} aoEscolher={setItemEscolhido} />}
      </div>

      {selecionando && (
        <ModalSelecionarProposta
          proposta={selecionando}
          item={item}
          troca={itemJaDecidido(item)}
          salvando={salvando}
          aoConfirmar={confirmarSelecao}
          aoFechar={() => setSelecionando(null)}
        />
      )}
    </EventoLayout>
  )
}

const VISOES = [
  { valor: 'cards', nome: 'Ver em cards', icone: iconeCards },
  { valor: 'lista', nome: 'Ver em lista', icone: iconeLista },
]

const idDaAba = (item) => `aba-item-${item.item_key}`

const TECLAS_DAS_ABAS = {
  ArrowRight: (indice, total) => (indice + 1) % total,
  ArrowLeft: (indice, total) => (indice - 1 + total) % total,
  Home: () => 0,
  End: (_, total) => total - 1,
}

// abas da WAI-ARIA: só a aba ativa entra no Tab; as setas, Home e End trocam de item
function AbasDosItens({ itens, itemAtual, aoEscolher }) {
  function aoTeclar(evento) {
    const proximo = TECLAS_DAS_ABAS[evento.key]
    if (!proximo) return
    evento.preventDefault()
    const atual = itens.findIndex((item) => item.item_key === itemAtual.item_key)
    const destino = itens[proximo(atual, itens.length)]
    aoEscolher(destino.item_key)
    document.getElementById(idDaAba(destino))?.focus()
  }

  return (
    <div
      className="itens-em-cotacao"
      role="tablist"
      aria-label="Itens em cotação"
      onKeyDown={aoTeclar}
    >
      {itens.map((item) => {
        const atual = item.item_key === itemAtual.item_key
        return (
          <button
            key={item.item_key}
            id={idDaAba(item)}
            type="button"
            role="tab"
            className={`aba-item${atual ? ' aba-item--ativa' : ''}`}
            aria-selected={atual}
            aria-controls="painel-das-propostas"
            tabIndex={atual ? 0 : -1}
            onClick={() => aoEscolher(item.item_key)}
          >
            {item.description}
            <span className="aba-item__conta">{item.proposals.length}</span>
          </button>
        )
      })}
    </div>
  )
}

function PropostasDoItem({
  eventKey,
  item,
  emLista,
  isMobile,
  eventoEmCotacao,
  visao,
  aoTrocarVisao,
  aoSelecionar,
}) {
  const menor = menorPropostaDisponivel(item)
  const decidido = itemJaDecidido(item)
  const propriedadesDe = (proposta) => ({
    eventKey,
    proposta,
    destaque: !decidido && proposta.proposal_key === menor?.proposal_key,
    podeSelecionar: podeSerSelecionada(proposta, item, eventoEmCotacao),
    troca: decidido,
    aoSelecionar: () => aoSelecionar(proposta),
  })
  const apoio = [
    item.category,
    item.estimated_value != null && `orçamento previsto ${formatarMoeda(item.estimated_value)}`,
    `${item.proposals.length} ${item.proposals.length === 1 ? 'proposta' : 'propostas'}`,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <section
      id="painel-das-propostas"
      role={emLista ? undefined : 'tabpanel'}
      aria-labelledby={emLista ? 'item-das-propostas' : idDaAba(item)}
    >
      <header className="propostas-do-item__cabecalho">
        <div>
          <h2 id="item-das-propostas">{item.description}</h2>
          <p>{apoio}</p>
        </div>
        {!isMobile && (
          <div className="visao" role="group" aria-label="Forma de ver as propostas">
            {VISOES.map((opcao) => (
              <button
                key={opcao.valor}
                type="button"
                className={`visao__botao${visao === opcao.valor ? ' visao__botao--ativo' : ''}`}
                aria-label={opcao.nome}
                aria-pressed={visao === opcao.valor}
                title={opcao.nome}
                onClick={() => aoTrocarVisao(opcao.valor)}
              >
                <Icone src={opcao.icone} />
              </button>
            ))}
          </div>
        )}
      </header>

      {item.proposals.length === 0 ? (
        <Vazio
          icone="propostas"
          titulo="Este item ainda não recebeu propostas"
          mensagem="Escolha outro item com propostas."
        />
      ) : emLista ? (
        <div className="lista-propostas">
          <div
            className="lista-propostas__linha lista-propostas__linha--cabecalho"
            aria-hidden="true"
          >
            <span>Fornecedor</span>
            <span>Valor</span>
            <span>Prazo de entrega</span>
            <span>Validade</span>
            <span />
          </div>
          {item.proposals.map((proposta) => (
            <LinhaDeProposta key={proposta.proposal_key} {...propriedadesDe(proposta)} />
          ))}
        </div>
      ) : (
        <div className="propostas-do-item__grade">
          {item.proposals.map((proposta) => (
            <CartaoDeProposta key={proposta.proposal_key} {...propriedadesDe(proposta)} />
          ))}
        </div>
      )}
    </section>
  )
}

function EtiquetasDaProposta({ proposta, destaque }) {
  return (
    <>
      {destaque && <span className="etiqueta etiqueta--aprovado">Menor valor</span>}
      {proposta.status === 'accepted' && (
        <span className="etiqueta etiqueta--aprovado">Selecionada</span>
      )}
      {proposta.status === 'rejected' && (
        <span className="etiqueta etiqueta--rejeitado">Recusada</span>
      )}
      {proposta.status === 'canceled' && (
        <span className="etiqueta etiqueta--rejeitado">Cancelada</span>
      )}
      {proposta.is_expired && <span className="etiqueta etiqueta--vencida">Vencida</span>}
    </>
  )
}

function AcaoDaProposta({ rota, destaque, podeSelecionar, troca, aoSelecionar }) {
  if (!podeSelecionar) {
    return (
      <Link to={rota} className="botao botao--secundario" viewTransition>
        Ver proposta
      </Link>
    )
  }
  return (
    <button
      type="button"
      className={destaque ? 'botao' : 'botao botao--secundario'}
      onClick={aoSelecionar}
    >
      {troca ? 'Trocar para esta' : destaque ? 'Selecionar proposta' : 'Selecionar'}
    </button>
  )
}

function LinhaDeProposta({ eventKey, proposta, destaque, podeSelecionar, troca, aoSelecionar }) {
  const rota = `/organizador/eventos/${eventKey}/propostas/${proposta.proposal_key}`
  return (
    <div className={`lista-propostas__linha${destaque ? ' lista-propostas__linha--destaque' : ''}`}>
      <span className="lista-propostas__fornecedor">
        <Link to={rota} viewTransition>
          {proposta.supplier_name}
        </Link>
        <EtiquetasDaProposta proposta={proposta} destaque={destaque} />
      </span>
      <strong>{formatarMoeda(proposta.amount)}</strong>
      <span>{proposta.delivery_terms}</span>
      <span>{formatarValidade(proposta.valid_until)}</span>
      <AcaoDaProposta
        rota={rota}
        destaque={destaque}
        podeSelecionar={podeSelecionar}
        troca={troca}
        aoSelecionar={aoSelecionar}
      />
    </div>
  )
}

function CartaoDeProposta({ eventKey, proposta, destaque, podeSelecionar, troca, aoSelecionar }) {
  const rota = `/organizador/eventos/${eventKey}/propostas/${proposta.proposal_key}`

  return (
    <article className={`cartao-proposta${destaque ? ' cartao-proposta--destaque' : ''}`}>
      <div className="cartao-proposta__etiquetas">
        <EtiquetasDaProposta proposta={proposta} destaque={destaque} />
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

      <AcaoDaProposta
        rota={rota}
        destaque={destaque}
        podeSelecionar={podeSelecionar}
        troca={troca}
        aoSelecionar={aoSelecionar}
      />
    </article>
  )
}

function situacaoDoItem(item) {
  if (itemJaDecidido(item)) return { nome: 'Selecionada', estilo: 'aprovado' }
  if (item.proposals.length === 0) return { nome: 'Sem propostas', estilo: 'neutro' }
  if (item.proposals.every((proposta) => proposta.status === 'canceled')) {
    return { nome: 'Cancelada', estilo: 'neutro' }
  }
  // só vencidas (ou encerradas): nenhuma pode mais ser escolhida
  if (!menorPropostaDisponivel(item)) return { nome: 'Sem propostas válidas', estilo: 'neutro' }
  return { nome: 'Em análise', estilo: 'cotacao' }
}

// item decidido mostra o valor escolhido; os demais, a menor proposta que ainda pode ser escolhida
function valorDoItem(item) {
  const proposta = propostaEscolhida(item) ?? menorPropostaDisponivel(item)
  return proposta ? formatarMoeda(proposta.amount) : '—'
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
            <span>{valorDoItem(item)}</span>
            <span className={`itens-cotacao__situacao itens-cotacao__situacao--${situacao.estilo}`}>
              {situacao.nome}
            </span>
          </button>
        )
      })}
    </section>
  )
}
