import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { EventoLayout } from '../../components/organizador/EventoLayout.jsx'
import { Carregando, ErroNaTela, Vazio } from '../../components/comum/EstadoDaTela.jsx'
import { Tabela } from '../../components/organizador/Tabela.jsx'
import { Botao } from '../../components/organizador/Formulario.jsx'
import { Cartao } from '../../components/organizador/Cartao.jsx'
import { useIsMobile } from '../../hooks/useIsMobile.js'
import { Icone } from '../../components/comum/Icone.jsx'
import { formatarMoeda } from '../../../application/eventos.js'
import { buscarComparacaoDePropostas, formatarValidade } from '../../../application/propostas.js'
import iconeAvancar from '../../assets/organizador/icone-avancar.svg'
import iconeCards from '../../assets/organizador/icone-cards.svg'
import iconeLista from '../../assets/organizador/icone-lista.svg'

const VISOES = [
  { valor: 'cards', nome: 'Ver em cards', icone: iconeCards },
  { valor: 'lista', nome: 'Ver em lista', icone: iconeLista },
]

function Etiquetas({ proposta }) {
  return (
    <>
      {proposta.status === 'accepted' && (
        <span className="etiqueta etiqueta--aprovado">Selecionada</span>
      )}
      {proposta.status === 'rejected' && (
        <span className="etiqueta etiqueta--rejeitado">Rejeitada</span>
      )}
      {proposta.is_expired && (
        <span className="etiqueta etiqueta--vencida">Vencida · indisponível para seleção</span>
      )}
    </>
  )
}

export function EventoPropostas() {
  const { id } = useParams()
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const [visao, setVisao] = useState('cards')
  const [itemAberto, setItemAberto] = useState('todos')
  const [resultado, setResultado] = useState({ event_key: null, items: [], error: null })
  const [tentativa, setTentativa] = useState(0)

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
  const itens = resultado.items
  const total = itens ? itens.reduce((soma, item) => soma + item.proposals.length, 0) : 0

  if (resultado.error && !carregando) {
    return (
      <EventoLayout>
        <ErroNaTela
          erro={resultado.error}
          aoTentarDeNovo={() => setTentativa((valor) => valor + 1)}
        />
      </EventoLayout>
    )
  }

  if (carregando) {
    return (
      <EventoLayout>
        <Carregando mensagem="Carregando propostas do evento…" />
      </EventoLayout>
    )
  }

  if (!itens || itens.length === 0 || total === 0) {
    return (
      <EventoLayout>
        <div className="painel-propostas">
          <Cartao titulo="Custo consolidado do evento">
            <strong className="decisao__valor">{formatarMoeda(resultado.total_cost)}</strong>
            <p className="cartao__apoio">Custos próprios e propostas aceitas.</p>
          </Cartao>
          <Vazio
            titulo="Não há propostas"
            mensagem="As propostas aparecem aqui quando os fornecedores responderem."
          />
        </div>
      </EventoLayout>
    )
  }

  const visiveis =
    itemAberto === 'todos' ? itens : itens.filter((item) => item.item_key === itemAberto)
  const emLista = !isMobile && visao === 'lista'

  const rotaDa = (proposta) => `/organizador/eventos/${id}/propostas/${proposta.proposal_key}`
  const abrir = (proposta) => navigate(rotaDa(proposta), { viewTransition: true })

  const abas = [
    { id: 'todos', nome: 'Todos os itens', conta: total },
    ...itens.map((item) => ({
      id: item.item_key,
      nome: item.description,
      conta: item.proposals.length,
    })),
  ]

  // abas da WAI-ARIA: só a aba ativa entra no Tab; as setas trocam de aba
  function aoTeclarNasAbas(evento) {
    const atual = abas.findIndex((aba) => aba.id === itemAberto)
    const destino = {
      ArrowRight: (atual + 1) % abas.length,
      ArrowLeft: (atual - 1 + abas.length) % abas.length,
      Home: 0,
      End: abas.length - 1,
    }[evento.key]
    if (destino === undefined) return

    evento.preventDefault()
    setItemAberto(abas[destino].id)
    document.getElementById(`aba-${abas[destino].id}`)?.focus()
  }

  return (
    <EventoLayout>
      <div className="painel-propostas__resumo">
        <Cartao titulo="Custo consolidado do evento">
          <strong className="decisao__valor">{formatarMoeda(resultado.total_cost)}</strong>
          <p className="cartao__apoio">Custos próprios e propostas aceitas.</p>
        </Cartao>
      </div>
      <div className="propostas-topo">
        <div
          className="itens-em-cotacao"
          role="tablist"
          aria-label="Itens em cotação"
          onKeyDown={aoTeclarNasAbas}
        >
          {abas.map((aba) => (
            <button
              key={aba.id}
              type="button"
              id={`aba-${aba.id}`}
              role="tab"
              aria-selected={aba.id === itemAberto}
              aria-controls="painel-propostas"
              tabIndex={aba.id === itemAberto ? 0 : -1}
              className={`aba-item${aba.id === itemAberto ? ' aba-item--ativa' : ''}`}
              onClick={() => setItemAberto(aba.id)}
            >
              {aba.nome}
              <span className="aba-item__conta">{aba.conta}</span>
            </button>
          ))}
        </div>

        {!isMobile && (
          <div className="visao">
            {VISOES.map((opcao) => (
              <button
                key={opcao.valor}
                type="button"
                className={`visao__botao${visao === opcao.valor ? ' visao__botao--ativo' : ''}`}
                aria-label={opcao.nome}
                aria-pressed={visao === opcao.valor}
                title={opcao.nome}
                onClick={() => setVisao(opcao.valor)}
              >
                <Icone src={opcao.icone} />
              </button>
            ))}
          </div>
        )}
      </div>

      <div
        id="painel-propostas"
        className="painel-propostas"
        role="tabpanel"
        aria-labelledby={`aba-${itemAberto}`}
        tabIndex={0}
      >
        {visiveis.map((item) => (
          <section key={item.item_key} className="grupo-propostas">
            <p className="proposta-recebida__origem">
              {item.proposals.length} propostas para <strong>{item.description}</strong>
            </p>

            {emLista ? (
              <Tabela
                colunas={['FORNECEDOR', 'VALOR', 'VALIDADE', 'OBSERVAÇÕES', '']}
                aoClicarNaLinha={(chave) =>
                  abrir(item.proposals.find((proposal) => proposal.proposal_key === chave))
                }
                linhas={item.proposals.map((proposta) => ({
                  chave: proposta.proposal_key,
                  celulas: [
                    <span className="lista-proposta__nome" key="nome">
                      {proposta.supplier_name}
                      <Etiquetas proposta={proposta} />
                    </span>,
                    formatarMoeda(proposta.amount),
                    formatarValidade(proposta.valid_until),
                    proposta.notes || 'Sem observações',
                    <Link key="acao" to={rotaDa(proposta)} className="cartao__link" viewTransition>
                      Ver proposta
                      <Icone src={iconeAvancar} />
                    </Link>,
                  ],
                }))}
              />
            ) : (
              <div className="comparacao">
                {item.proposals.map((proposta) => (
                  <article
                    key={proposta.proposal_key}
                    className={`proposta${proposta.is_expired ? ' proposta--vencida' : ''}`}
                  >
                    <div className="proposta__etiquetas">
                      <Etiquetas proposta={proposta} />
                    </div>

                    <div className="proposta__cabecalho">
                      <strong className="proposta__fornecedor">{proposta.supplier_name}</strong>
                      <strong className="proposta__valor">{formatarMoeda(proposta.amount)}</strong>
                    </div>

                    <div className="proposta__dados">
                      <div>
                        <span>{isMobile ? 'Validade' : 'Validade da proposta'}</span>
                        <strong>{formatarValidade(proposta.valid_until)}</strong>
                      </div>
                    </div>

                    <div className="proposta__observacoes">
                      <span>Observações</span>
                      <p>{proposta.notes || 'Nenhuma observação enviada.'}</p>
                    </div>

                    <Botao type="button" secundario onClick={() => abrir(proposta)}>
                      Ver proposta
                    </Botao>
                  </article>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </EventoLayout>
  )
}
