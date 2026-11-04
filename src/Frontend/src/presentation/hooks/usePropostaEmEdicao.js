import { useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  atualizarRascunho,
  descartarRascunho,
  lerRascunho,
} from '../../application/rascunhosDePropostas.js'
import { useEventoDisponivel } from './useEventoDisponivel.js'

// Evento, item e rascunho da proposta das rotas /fornecedor/eventos/:id/itens/:itemKey/propostas/etapa-N.
// O rascunho é o mesmo nas 3 etapas (application/rascunhosDePropostas.js).
//   const proposta = usePropostaEmEdicao()
//   <input value={proposta.rascunho.valor} onChange={proposta.preencher('valor')} />
export function usePropostaEmEdicao() {
  const { id, itemKey } = useParams()
  const { carregando, evento, erro, tentarDeNovo } = useEventoDisponivel(id)
  const [rascunho, setRascunho] = useState(() => lerRascunho(id, itemKey))

  // o item só aparece se estiver numa categoria do fornecedor (a API já filtra)
  const item = evento?.items.find((candidato) => candidato.item_key === itemKey) ?? null

  function preencher(campo) {
    return (evento) => setRascunho(atualizarRascunho(id, itemKey, { [campo]: evento.target.value }))
  }

  return {
    eventKey: id,
    itemKey,
    carregando,
    erro,
    evento,
    item,
    rascunho,
    preencher,
    tentarDeNovo,
    descartar: () => descartarRascunho(id, itemKey),
    rotaDaEtapa: (etapa) => `/fornecedor/eventos/${id}/itens/${itemKey}/propostas/etapa-${etapa}`,
  }
}
