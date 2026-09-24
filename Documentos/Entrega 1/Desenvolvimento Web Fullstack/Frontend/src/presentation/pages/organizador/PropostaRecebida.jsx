import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { EventoLayout } from '../../components/organizador/EventoLayout.jsx'
import { Cartao } from '../../components/organizador/Cartao.jsx'
import { Modal } from '../../components/comum/Modal.jsx'
import { buscarEvento } from '../../data/eventos.js'
import iconeAceitar from '../../assets/organizador/icone-modal-aceitar.svg'
import iconeRecusar from '../../assets/organizador/icone-modal-recusar.svg'

export function PropostaRecebida() {
  const { id } = useParams()
  const [decisao, setDecisao] = useState(null)
  const comparacao = buscarEvento(id)?.detalhe?.comparacao
  const proposta = comparacao?.recebida

  if (!proposta) return <EventoLayout />

  const fechar = () => setDecisao(null)

  return (
    <EventoLayout>
      <p className="proposta-recebida__origem">Propostas · {comparacao.item}</p>

      <div className="colunas">
        <div className="colunas__principal">
          <section className="cartao">
            <div className="fornecedor">
              <span className="fornecedor__avatar">{proposta.iniciais}</span>

              <div className="fornecedor__nome">
                <strong>{proposta.fornecedor}</strong>
                <small>{proposta.identificacao}</small>
              </div>

              <span className="etiqueta etiqueta--aprovado">{proposta.etiqueta}</span>
            </div>
          </section>

          <Cartao titulo="Condições da proposta">
            {proposta.condicoes.map((condicao) => (
              <div key={condicao.rotulo} className="dado-linha">
                <span>{condicao.rotulo}</span>
                <strong>{condicao.valor}</strong>
              </div>
            ))}
          </Cartao>

          <Cartao titulo="Descrição enviada pelo fornecedor">
            {proposta.descricao.map((bloco) => (
              <div key={bloco.titulo} className="descricao">
                <span className="cartao__rotulo">{bloco.titulo}</span>
                <p>{bloco.texto}</p>
              </div>
            ))}
          </Cartao>
        </div>

        <div className="colunas__lateral colunas__lateral--estreita">
          <Cartao titulo="Decisão sobre a proposta">
            <strong className="decisao__valor">{proposta.valor}</strong>
            <span className="etiqueta etiqueta--aprovado">{proposta.comparacao}</span>
            <p className="cartao__apoio">Ao selecionar, o valor entra nos itens de custo e o ticket é recalculado.</p>

            <button type="button" className="botao botao--largo" onClick={() => setDecisao('selecionar')}>
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

          <Cartao titulo="Outras propostas do item">
            {proposta.outras.map((outra) => (
              <div key={outra.fornecedor} className="dado-linha">
                <span>{outra.fornecedor}</span>
                <strong>{outra.valor}</strong>
              </div>
            ))}
          </Cartao>
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
            { rotulo: 'Item', valor: comparacao.item },
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
