import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { EventoLayout } from '../../components/organizador/EventoLayout.jsx'
import { Tabela } from '../../components/organizador/Tabela.jsx'
import { Botao } from '../../components/organizador/Formulario.jsx'
import { useIsMobile } from '../../hooks/useIsMobile.js'
import { buscarEvento, estaVencida } from '../../data/eventos.js'
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
      {proposta.selecionada && <span className="etiqueta etiqueta--aprovado">Selecionada</span>}
      {estaVencida(proposta.validade) && (
        <span className="etiqueta etiqueta--vencida">Vencida</span>
      )}
      {proposta.etiqueta && (
        <span className="etiqueta etiqueta--destaque">{proposta.etiqueta}</span>
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
  const itens = buscarEvento(id)?.detalhe?.comparacao?.itens

  if (!itens) return <EventoLayout />

  const visiveis = itemAberto === 'todos' ? itens : itens.filter((item) => item.id === itemAberto)
  const emLista = !isMobile && visao === 'lista'
  const total = itens.reduce((soma, item) => soma + item.propostas.length, 0)

  const rotaDa = (proposta) => `/organizador/eventos/${id}/propostas/${proposta.id}`
  const abrir = (proposta) => navigate(rotaDa(proposta), { viewTransition: true })

  const abas = [
    { id: 'todos', nome: 'Todos os itens', conta: total },
    ...itens.map((item) => ({ id: item.id, nome: item.nome, conta: item.propostas.length })),
  ]

  return (
    <EventoLayout>
      <div className="propostas-topo">
        <div className="itens-em-cotacao" role="tablist" aria-label="Itens em cotação">
          {abas.map((aba) => (
            <button
              key={aba.id}
              type="button"
              role="tab"
              aria-selected={aba.id === itemAberto}
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
                <img src={opcao.icone} alt="" />
              </button>
            ))}
          </div>
        )}
      </div>

      {visiveis.map((item) => (
        <section key={item.id} className="grupo-propostas">
          <p className="proposta-recebida__origem">
            {item.propostas.length} propostas para <strong>{item.nome}</strong>
            <span
              className={`etiqueta etiqueta--${item.situacao === 'Selecionada' ? 'aprovado' : 'cotacao'}`}
            >
              {item.situacao}
            </span>
          </p>

          {emLista ? (
            <Tabela
              colunas={['FORNECEDOR', 'VALOR', 'PRAZO DE ENTREGA', 'VALIDADE', '']}
              aoClicarNaLinha={(chave) => abrir(item.propostas.find((p) => p.id === chave))}
              linhas={item.propostas.map((proposta) => ({
                chave: proposta.id,
                celulas: [
                  <span className="lista-proposta__nome" key="nome">
                    {proposta.fornecedor}
                    <Etiquetas proposta={proposta} />
                  </span>,
                  proposta.valor,
                  proposta.prazo,
                  proposta.validade,
                  <Link key="acao" to={rotaDa(proposta)} className="cartao__link" viewTransition>
                    Ver proposta
                    <img src={iconeAvancar} alt="" />
                  </Link>,
                ],
              }))}
            />
          ) : (
            <div className="comparacao">
              {item.propostas.map((proposta) => (
                <article
                  key={proposta.id}
                  className={`proposta${estaVencida(proposta.validade) ? ' proposta--vencida' : ''}`}
                  onClick={() => abrir(proposta)}
                >
                  <div className="proposta__etiquetas">
                    <Etiquetas proposta={proposta} />
                  </div>

                  <div className="proposta__cabecalho">
                    <strong className="proposta__fornecedor">{proposta.fornecedor}</strong>
                    <strong className="proposta__valor">{proposta.valor}</strong>
                  </div>

                  <div className="proposta__dados">
                    <div>
                      <span>Prazo de entrega</span>
                      <strong>{proposta.prazo}</strong>
                    </div>
                    <div>
                      <span>{isMobile ? 'Validade' : 'Validade da proposta'}</span>
                      <strong>{proposta.validade}</strong>
                    </div>
                  </div>

                  <Botao type="button" secundario>
                    Ver proposta
                  </Botao>
                </article>
              ))}
            </div>
          )}
        </section>
      ))}
    </EventoLayout>
  )
}
