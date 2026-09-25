import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { EventoLayout } from '../../components/organizador/EventoLayout.jsx'
import { Cartao } from '../../components/organizador/Cartao.jsx'
import { Modal } from '../../components/comum/Modal.jsx'
import { buscarEvento } from '../../data/eventos.js'
import iconeAceitar from '../../assets/organizador/icone-modal-aceitar.svg'
import iconeRecusar from '../../assets/organizador/icone-modal-recusar.svg'

export function PropostaRecebida() {
  const { id, proposta: idDaProposta } = useParams()
  const [decisao, setDecisao] = useState(null)
  const itens = buscarEvento(id)?.detalhe?.comparacao?.itens

  const item = itens?.find((linha) => linha.propostas.some((p) => p.id === idDaProposta))
  const proposta = item?.propostas.find((p) => p.id === idDaProposta)

  if (!proposta) return <EventoLayout />

  const fechar = () => setDecisao(null)
  const outras = item.propostas.filter((p) => p.id !== proposta.id)

  const condicoes = [
    { rotulo: 'Valor proposto', valor: proposta.valor },
    { rotulo: 'Orçamento previsto para o item', valor: proposta.orcamento },
    { rotulo: 'Diferença', valor: proposta.diferenca },
    { rotulo: 'Validade da proposta', valor: proposta.validade },
    { rotulo: 'Prazo de entrega ou montagem', valor: `Montagem ${proposta.prazo} do evento` },
    { rotulo: 'Condição de pagamento', valor: proposta.pagamento },
  ]

  return (
    <EventoLayout voltar={{ para: `/organizador/eventos/${id}/propostas`, nome: 'Propostas' }}>
      <p className="proposta-recebida__origem">Propostas · {item.nome}</p>

      <div className="colunas">
        <div className="colunas__principal">
          <section className="cartao">
            <div className="fornecedor">
              <span className="fornecedor__avatar">{proposta.iniciais}</span>

              <div className="fornecedor__nome">
                <strong>{proposta.fornecedor}</strong>
                <small>{proposta.identificacao}</small>
              </div>

              {proposta.etiqueta && (
                <span className="etiqueta etiqueta--destaque">{proposta.etiqueta}</span>
              )}
            </div>
          </section>

          <Cartao titulo="Condições da proposta">
            {condicoes.map((condicao) => (
              <div key={condicao.rotulo} className="dado-linha">
                <span>{condicao.rotulo}</span>
                <strong>{condicao.valor}</strong>
              </div>
            ))}
          </Cartao>

          <Cartao titulo="Descrição enviada pelo fornecedor">
            <div className="descricao">
              <span className="cartao__rotulo">O QUE ESTÁ INCLUÍDO</span>
              <p>{proposta.incluido}</p>
            </div>
            <div className="descricao">
              <span className="cartao__rotulo">O QUE NÃO ESTÁ INCLUÍDO</span>
              <p>{proposta.naoIncluido}</p>
            </div>
          </Cartao>
        </div>

        <div className="colunas__lateral colunas__lateral--estreita">
          <Cartao titulo="Decisão sobre a proposta">
            <strong className="decisao__valor">{proposta.valor}</strong>
            <span className="etiqueta etiqueta--aprovado">{proposta.comparacao}</span>
            <p className="cartao__apoio">
              Ao selecionar, o valor entra nos itens de custo e o ticket é recalculado.
            </p>

            <button
              type="button"
              className="botao botao--largo"
              onClick={() => setDecisao('selecionar')}
            >
              Selecionar proposta
            </button>
            <button
              type="button"
              className="botao botao--largo botao--secundario"
              onClick={() => setDecisao('recusar')}
            >
              Recusar proposta
            </button>
          </Cartao>

          {outras.length > 0 && (
            <Cartao titulo="Outras propostas do item">
              {outras.map((outra) => (
                <div key={outra.id} className="dado-linha">
                  <span>{outra.fornecedor}</span>
                  <strong>{outra.valor}</strong>
                </div>
              ))}
            </Cartao>
          )}
        </div>
      </div>

      {decisao === 'selecionar' && (
        <Modal
          icone={iconeAceitar}
          corDoIcone="verde"
          titulo="Selecionar esta proposta?"
          mensagem="O valor entra nos itens de custo do evento e o ticket é recalculado. As demais propostas deste item ficam recusadas."
          dados={[
            { rotulo: 'Fornecedor', valor: proposta.fornecedor },
            { rotulo: 'Item', valor: item.nome },
            { rotulo: 'Valor', valor: proposta.valor },
          ]}
          acao={{ confirmar: 'Selecionar proposta' }}
          aoFechar={fechar}
        />
      )}

      {decisao === 'recusar' && (
        <Modal
          icone={iconeRecusar}
          corDoIcone="vermelho"
          titulo="Recusar esta proposta?"
          mensagem="O fornecedor será avisado de que a proposta não foi aceita. Esta ação não pode ser desfeita."
          dados={[
            { rotulo: 'Fornecedor', valor: proposta.fornecedor },
            { rotulo: 'Valor', valor: proposta.valor },
          ]}
          acao={{ confirmar: 'Recusar proposta' }}
          aoFechar={fechar}
        />
      )}
    </EventoLayout>
  )
}
