// Exibe os detalhes da proposta selecionada na comparação do evento.

import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import {
  aceitarPropostaDoEvento,
  buscarComparacaoDePropostas,
  formatarValidade,
} from '../../../application/propostas.js'
import { formatarMoeda } from '../../../application/eventos.js'
import { Carregando, ErroNaTela, Vazio } from '../../components/comum/EstadoDaTela.jsx'
import { Modal } from '../../components/comum/Modal.jsx'
import { Cartao } from '../../components/organizador/Cartao.jsx'
import { EventoLayout } from '../../components/organizador/EventoLayout.jsx'
import { Botao } from '../../components/organizador/Formulario.jsx'
import { toast } from '../../toasts.js'
import iconeAceitar from '../../assets/organizador/icone-modal-aceitar.svg'

export function PropostaRecebida() {
  const { id, proposta: proposalKey } = useParams()
  const [comparacao, setComparacao] = useState(null)
  const [erro, setErro] = useState(null)
  const [tentativa, setTentativa] = useState(0)
  const [confirmacaoAberta, setConfirmacaoAberta] = useState(false)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    let telaAberta = true

    buscarComparacaoDePropostas(id)
      .then((resposta) => {
        if (telaAberta) {
          setComparacao(resposta)
          setErro(null)
        }
      })
      .catch((erroDaApi) => {
        if (telaAberta) setErro(erroDaApi)
      })

    return () => {
      telaAberta = false
    }
  }, [id, tentativa])

  const comparacaoDoEvento = comparacao?.event_key === id ? comparacao : null
  const item = comparacaoDoEvento?.items.find((budgetItem) =>
    budgetItem.proposals.some((proposal) => proposal.proposal_key === proposalKey),
  )
  const proposta = item?.proposals.find((proposal) => proposal.proposal_key === proposalKey)

  if (erro && !comparacaoDoEvento) {
    return (
      <EventoLayout>
        <ErroNaTela erro={erro} aoTentarDeNovo={() => setTentativa((valor) => valor + 1)} />
      </EventoLayout>
    )
  }

  if (!comparacaoDoEvento) {
    return (
      <EventoLayout>
        <Carregando mensagem="Carregando proposta…" />
      </EventoLayout>
    )
  }

  if (!proposta) {
    return (
      <EventoLayout>
        <Vazio
          titulo="Proposta não encontrada"
          mensagem="Ela pode ter sido removida. Volte para a lista de propostas do evento."
        />
      </EventoLayout>
    )
  }

  const outras = item.proposals.filter(
    (otherProposal) => otherProposal.proposal_key !== proposalKey,
  )
  const existeOutraSelecionada = outras.some((otherProposal) => otherProposal.status === 'accepted')

  async function confirmarAceite() {
    setSalvando(true)
    try {
      const comparacaoAtualizada = await aceitarPropostaDoEvento(id, proposalKey)
      setComparacao(comparacaoAtualizada)
      setConfirmacaoAberta(false)
      toast.sucesso('Proposta aceita', { descricao: proposta.supplier_name })
    } catch (falha) {
      toast.erro('Não foi possível aceitar a proposta', { descricao: falha.message })
      if (falha.status === 409) setTentativa((valor) => valor + 1)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <EventoLayout voltar={{ para: `/organizador/eventos/${id}/propostas`, nome: 'Propostas' }}>
      <p className="proposta-recebida__origem">Propostas · {item.description}</p>

      <div className="colunas">
        <div className="colunas__principal">
          <Cartao titulo={`Proposta de ${proposta.supplier_name}`}>
            <div className="dado-linha">
              <span>Valor proposto</span>
              <strong>{formatarMoeda(proposta.amount)}</strong>
            </div>
            <div className="dado-linha">
              <span>Validade</span>
              <strong>{formatarValidade(proposta.valid_until)}</strong>
            </div>
          </Cartao>

          <Cartao titulo="Observações do fornecedor">
            <p>{proposta.notes || 'Nenhuma observação enviada.'}</p>
          </Cartao>
        </div>

        <div className="colunas__lateral colunas__lateral--estreita">
          <Cartao titulo="Disponibilidade">
            {proposta.is_expired ? (
              <span className="etiqueta etiqueta--vencida">
                Vencida · indisponível para seleção
              </span>
            ) : proposta.status === 'accepted' ? (
              <span className="etiqueta etiqueta--aprovado">Selecionada</span>
            ) : proposta.status === 'rejected' ? (
              <span className="etiqueta etiqueta--rejeitado">Rejeitada anteriormente</span>
            ) : (
              <span className="etiqueta etiqueta--aprovado">Dentro do prazo de validade</span>
            )}

            <p className="cartao__apoio">
              Custo consolidado: {formatarMoeda(comparacaoDoEvento.total_cost)}
            </p>

            <Botao
              type="button"
              disabled={proposta.is_expired || proposta.status === 'accepted' || salvando}
              onClick={() => setConfirmacaoAberta(true)}
            >
              {proposta.status === 'accepted'
                ? 'Proposta selecionada'
                : existeOutraSelecionada
                  ? 'Trocar proposta escolhida'
                  : 'Aceitar proposta'}
            </Botao>
          </Cartao>

          {outras.length > 0 && (
            <Cartao titulo="Outras propostas do item">
              {outras.map((outra) => (
                <Link
                  key={outra.proposal_key}
                  className="dado-linha"
                  to={`/organizador/eventos/${id}/propostas/${outra.proposal_key}`}
                >
                  <span>
                    {outra.supplier_name}
                    {outra.is_expired && <small> · vencida</small>}
                  </span>
                  <strong>{formatarMoeda(outra.amount)}</strong>
                </Link>
              ))}
            </Cartao>
          )}
        </div>
      </div>

      {confirmacaoAberta && (
        <Modal
          icone={iconeAceitar}
          corDoIcone="verde"
          titulo={existeOutraSelecionada ? 'Trocar proposta escolhida?' : 'Aceitar esta proposta?'}
          mensagem="As outras propostas deste item serão rejeitadas e o custo consolidado será atualizado."
          dados={[
            { rotulo: 'Fornecedor', valor: proposta.supplier_name },
            { rotulo: 'Item', valor: item.description },
            { rotulo: 'Valor', valor: formatarMoeda(proposta.amount) },
          ]}
          acao={{ confirmar: 'Aceitar proposta', ocupado: salvando, aoConfirmar: confirmarAceite }}
          aoFechar={() => setConfirmacaoAberta(false)}
        />
      )}
    </EventoLayout>
  )
}
