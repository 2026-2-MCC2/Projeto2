// Uma proposta recebida, no padrão do Figma: fornecedor, condições, descrição e fotos à esquerda;
// a decisão e as outras propostas do item à direita.

import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import {
  aceitarPropostaDoEvento,
  buscarComparacaoDePropostas,
  formatarValidade,
  itemJaDecidido,
  menorPropostaDisponivel,
  podeSerSelecionada,
} from '../../../application/propostas.js'
import {
  comparacaoComPrevisto,
  formatarCnpj,
  formatarMoeda,
  iniciais,
} from '../../../domain/formatacao.js'
import { Carregando, ErroNaTela, Vazio } from '../../components/comum/EstadoDaTela.jsx'
import { Cartao } from '../../components/organizador/Cartao.jsx'
import { EventoLayout } from '../../components/organizador/EventoLayout.jsx'
import { Botao } from '../../components/organizador/Formulario.jsx'
import { ModalSelecionarProposta } from '../../components/organizador/ModalSelecionarProposta.jsx'
import { toast } from '../../toasts.js'
import { useEvento } from '../../hooks/useEvento.js'
import { useRenovarFotosVencidas } from '../../hooks/useRenovarFotosVencidas.js'

const TEXTOS_DA_PROPOSTA = [
  { campo: 'description', rotulo: 'O que está incluído' },
  { campo: 'not_included', rotulo: 'O que não está incluído' },
  { campo: 'notes', rotulo: 'Observações' },
]

export function PropostaRecebida() {
  const { id, proposta: proposalKey } = useParams()
  const [comparacao, setComparacao] = useState(null)
  const [erro, setErro] = useState(null)
  const [tentativa, setTentativa] = useState(0)
  const [confirmacaoAberta, setConfirmacaoAberta] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const aoFalharFoto = useRenovarFotosVencidas(() => setTentativa((valor) => valor + 1))
  const { evento } = useEvento(id)
  const eventoEmCotacao = evento?.statusReal === 'open_for_quotes'

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
          icone="atencao"
          titulo="Proposta não encontrada"
          mensagem="Ela pode ter sido retirada pelo fornecedor. Volte para a lista de propostas do evento."
        />
      </EventoLayout>
    )
  }

  const outras = item.proposals.filter((outra) => outra.proposal_key !== proposalKey)
  const menorValor =
    !itemJaDecidido(item) && menorPropostaDisponivel(item)?.proposal_key === proposalKey
  // valor previsto 0 não serve de referência: a diferença em % dividiria por zero
  const temPrevisto = item.estimated_value > 0
  const troca = itemJaDecidido(item)
  const podeSelecionar = podeSerSelecionada(proposta, item, eventoEmCotacao)

  async function confirmarSelecao() {
    setSalvando(true)
    try {
      const atualizada = await aceitarPropostaDoEvento(id, proposalKey)
      setComparacao(atualizada)
      setConfirmacaoAberta(false)
      toast.sucesso('Proposta selecionada', {
        descricao: `${proposta.supplier_name} · custo consolidado ${formatarMoeda(atualizada.total_cost)}`,
      })
    } catch (falha) {
      toast.erro('Não foi possível selecionar a proposta', { descricao: falha.message })
      // 409: a proposta mudou (retirada, vencida, evento fora de cotação); o modal não fica com a velha
      if (falha.status === 409) {
        setConfirmacaoAberta(false)
        setTentativa((valor) => valor + 1)
      }
    } finally {
      setSalvando(false)
    }
  }

  return (
    <EventoLayout voltar={{ para: `/organizador/eventos/${id}/propostas`, nome: 'Propostas' }}>
      <p className="proposta-recebida__origem">Propostas · {item.description}</p>

      <div className="colunas proposta-recebida">
        <div className="colunas__principal">
          <section className="cartao proposta-recebida__fornecedor">
            <span className="proposta-recebida__avatar" aria-hidden="true">
              {iniciais(proposta.supplier_name)}
            </span>
            <div>
              <h2>{proposta.supplier_name}</h2>
              <p>
                {[
                  proposta.supplier_cnpj && `CNPJ ${formatarCnpj(proposta.supplier_cnpj)}`,
                  item.category,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
            <EtiquetaDaSituacao proposta={proposta} menorValor={menorValor} />
          </section>

          <Cartao titulo="Condições da proposta">
            <dl className="linhas-de-dados">
              <Linha rotulo="Valor proposto" valor={formatarMoeda(proposta.amount)} />
              {temPrevisto && (
                <>
                  <Linha
                    rotulo="Orçamento previsto para o item"
                    valor={formatarMoeda(item.estimated_value)}
                  />
                  <Linha
                    rotulo="Diferença"
                    valor={textoDaDiferenca(proposta.amount, item.estimated_value)}
                    estilo={proposta.amount <= item.estimated_value ? 'positivo' : 'negativo'}
                  />
                </>
              )}
              <Linha rotulo="Validade da proposta" valor={formatarValidade(proposta.valid_until)} />
              <Linha rotulo="Prazo de entrega ou montagem" valor={proposta.delivery_terms} />
              <Linha rotulo="Condição de pagamento" valor={proposta.payment_terms} />
              {proposta.team && <Linha rotulo="Equipe envolvida" valor={proposta.team} />}
              {proposta.warranty && (
                <Linha rotulo="Garantia ou substituição" valor={proposta.warranty} />
              )}
            </dl>
          </Cartao>

          <Cartao titulo="Descrição enviada pelo fornecedor">
            <div className="detalhe-proposta__textos">
              {TEXTOS_DA_PROPOSTA.filter(({ campo }) => proposta[campo]).map(
                ({ campo, rotulo }) => (
                  <div key={campo}>
                    <h3>{rotulo}</h3>
                    <p>{proposta[campo]}</p>
                  </div>
                ),
              )}
            </div>
          </Cartao>

          {proposta.photos?.some((foto) => foto.url) && (
            <Cartao titulo="Fotos enviadas">
              <div className="proposta-recebida__fotos">
                {proposta.photos
                  .filter((foto) => foto.url)
                  .map((foto, indice) => (
                    <a key={foto.photo_key} href={foto.url} target="_blank" rel="noreferrer">
                      <img
                        src={foto.url}
                        alt={`Foto ${indice + 1} enviada pelo fornecedor`}
                        onError={aoFalharFoto}
                      />
                    </a>
                  ))}
              </div>
            </Cartao>
          )}
        </div>

        <aside className="colunas__lateral">
          <Cartao titulo="Decisão sobre a proposta">
            <strong className="proposta-recebida__valor">{formatarMoeda(proposta.amount)}</strong>
            {temPrevisto && (
              <span
                className={`etiqueta ${proposta.amount <= item.estimated_value ? 'etiqueta--aprovado' : 'etiqueta--rejeitado'}`}
              >
                {comparacaoComPrevisto(proposta.amount, item.estimated_value, 'orçamento')}
              </span>
            )}
            <p className="cartao__apoio">{textoDaDecisao(proposta, item, eventoEmCotacao)}</p>
            <p className="cartao__apoio">
              Custo consolidado do evento:{' '}
              <strong>{formatarMoeda(comparacaoDoEvento.total_cost)}</strong>
            </p>
            {podeSelecionar && (
              <Botao type="button" disabled={salvando} onClick={() => setConfirmacaoAberta(true)}>
                {troca ? 'Trocar para esta proposta' : 'Selecionar proposta'}
              </Botao>
            )}
          </Cartao>

          {outras.length > 0 && (
            <Cartao titulo="Outras propostas do item">
              <dl className="linhas-de-dados">
                {outras.map((outra) => (
                  <div key={outra.proposal_key}>
                    <dt>
                      <Link to={`/organizador/eventos/${id}/propostas/${outra.proposal_key}`}>
                        {outra.supplier_name}
                      </Link>
                      {outra.is_expired && <small> · vencida</small>}
                    </dt>
                    <dd>{formatarMoeda(outra.amount)}</dd>
                  </div>
                ))}
              </dl>
            </Cartao>
          )}
        </aside>
      </div>

      {confirmacaoAberta && (
        <ModalSelecionarProposta
          proposta={proposta}
          item={item}
          troca={troca}
          salvando={salvando}
          aoConfirmar={confirmarSelecao}
          aoFechar={() => setConfirmacaoAberta(false)}
        />
      )}
    </EventoLayout>
  )
}

function Linha({ rotulo, valor, estilo }) {
  return (
    <div>
      <dt>{rotulo}</dt>
      <dd className={estilo ? `linhas-de-dados__valor--${estilo}` : undefined}>{valor}</dd>
    </div>
  )
}

function EtiquetaDaSituacao({ proposta, menorValor }) {
  if (proposta.status === 'accepted')
    return <span className="etiqueta etiqueta--aprovado">Selecionada</span>
  if (proposta.status === 'rejected')
    return <span className="etiqueta etiqueta--rejeitado">Recusada</span>
  if (proposta.status === 'canceled')
    return <span className="etiqueta etiqueta--rejeitado">Cancelada</span>
  if (proposta.is_expired) return <span className="etiqueta etiqueta--vencida">Vencida</span>
  if (menorValor) return <span className="etiqueta etiqueta--aprovado">Menor valor</span>
  return null
}

function textoDaDiferenca(valor, previsto) {
  const diferenca = previsto - valor
  if (diferenca === 0) return 'Igual ao previsto'
  return `${formatarMoeda(Math.abs(diferenca))} ${diferenca > 0 ? 'abaixo' : 'acima'} do previsto`
}

function textoDaDecisao(proposta, item, eventoEmCotacao) {
  if (proposta.status === 'canceled') return 'O evento foi cancelado e esta proposta foi encerrada.'
  if (proposta.status === 'accepted') return 'Esta é a proposta escolhida para o item.'
  if (!eventoEmCotacao) return 'O evento não está mais em cotação: a escolha não pode mudar.'
  if (proposta.is_expired) return 'A validade passou: esta proposta não pode mais ser escolhida.'
  if (itemJaDecidido(item)) {
    return 'Outra proposta está escolhida. Ao trocar, ela fica recusada e esta entra no custo.'
  }
  return 'Ao selecionar, o valor entra nos itens de custo e o ticket é recalculado.'
}
