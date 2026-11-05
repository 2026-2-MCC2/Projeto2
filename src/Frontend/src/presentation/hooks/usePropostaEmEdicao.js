import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { buscarMinhaProposta, paraRascunho } from '../../application/propostas.js'
import {
  atualizarRascunho,
  descartarRascunho,
  lerRascunho,
} from '../../application/rascunhosDePropostas.js'
import { useEventoDisponivel } from './useEventoDisponivel.js'
import { toast } from '../toasts.js'

// Evento, item e rascunho da proposta das rotas /fornecedor/eventos/:id/itens/:itemKey/propostas/etapa-N.
// O rascunho é o mesmo nas 3 etapas (application/rascunhosDePropostas.js).
// Se o fornecedor já enviou proposta para o item e ela ainda está "Enviada", as etapas viram a
// edição dela: o rascunho começa com os dados da proposta e o envio final usa o PUT.
//   const proposta = usePropostaEmEdicao()
//   <input value={proposta.rascunho.valor} onChange={proposta.preencher('valor')} />
// Os links que abrem as etapas mandam este estado: entrar na edição sempre recarrega a proposta salva,
// para um rascunho abandonado antes não ser salvo por engano. Entre as etapas o rascunho continua.
export const ENTRAR_NA_EDICAO = { recarregarProposta: true }

export function usePropostaEmEdicao() {
  const { id, itemKey } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [recarregarAoEntrar, setRecarregarAoEntrar] = useState(
    () => location.state?.recarregarProposta === true,
  )
  const evento = useEventoDisponivel(id)
  const recarregarEvento = evento.tentarDeNovo
  const [rascunho, setRascunho] = useState(() => lerRascunho(id, itemKey))
  const [erroDaEdicao, setErroDaEdicao] = useState(null)
  const [tentativaDaEdicao, setTentativaDaEdicao] = useState(0)

  // o item só aparece se estiver numa categoria do fornecedor (a API já filtra)
  const item = evento.evento?.items.find((candidato) => candidato.item_key === itemKey) ?? null
  const propostaEnviada = item?.my_proposal?.status === 'sent' ? item.my_proposal : null
  const proposalKey = propostaEnviada?.proposal_key ?? null
  const precisaCarregarProposta =
    proposalKey !== null && (recarregarAoEntrar || rascunho.chaveDaProposta !== proposalKey)

  // O pedido de recarga já ficou em recarregarAoEntrar. Ele sai da entrada do histórico para o voltar
  // do navegador até esta etapa não recarregar a proposta salva por cima do que foi editado.
  useEffect(() => {
    if (location.state?.recarregarProposta !== true) return
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null })
  }, [location, navigate])

  useEffect(() => {
    if (!precisaCarregarProposta) return
    let telaAberta = true

    buscarMinhaProposta(proposalKey)
      .then((detalhe) => {
        if (!telaAberta) return
        setRascunho(
          atualizarRascunho(id, itemKey, {
            ...paraRascunho(detalhe),
            chaveDaProposta: proposalKey,
          }),
        )
        setRecarregarAoEntrar(false)
      })
      .catch((erro) => {
        if (!telaAberta) return
        // retirada em outra aba: recarrega o evento, a proposta some do item e a tela vira um envio novo
        if (erro.status === 404) {
          toast.info('Esta proposta foi retirada', {
            descricao: 'Você pode enviar uma proposta nova para o item.',
          })
          recarregarEvento()
          return
        }
        setErroDaEdicao(erro)
      })

    return () => {
      telaAberta = false
    }
  }, [precisaCarregarProposta, proposalKey, id, itemKey, tentativaDaEdicao, recarregarEvento])

  function preencher(campo) {
    return (evento) => setRascunho(atualizarRascunho(id, itemKey, { [campo]: evento.target.value }))
  }

  return {
    eventKey: id,
    itemKey,
    carregando: evento.carregando || (precisaCarregarProposta && !erroDaEdicao),
    erro: evento.erro ?? erroDaEdicao,
    evento: evento.evento,
    item,
    // edição de uma proposta já enviada (PUT) ou envio de uma nova (POST)
    editando: proposalKey !== null,
    proposalKey,
    rascunho,
    preencher,
    tentarDeNovo: () => {
      setErroDaEdicao(null)
      setTentativaDaEdicao((valor) => valor + 1)
      evento.tentarDeNovo()
    },
    descartar: () => descartarRascunho(id, itemKey),
    rotaDaEtapa: (etapa) => `/fornecedor/eventos/${id}/itens/${itemKey}/propostas/etapa-${etapa}`,
  }
}
