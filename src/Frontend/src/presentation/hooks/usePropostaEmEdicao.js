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

// entrar na edição recarrega a proposta salva, para um rascunho abandonado não ser salvo por engano
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

  // proposta retirada: o envio reativa a mesma, então o formulário começa com os dados dela
  const chaveDaRetirada =
    item?.my_proposal?.status === 'withdrawn' ? item.my_proposal.proposal_key : null
  const [retiradaCarregada, setRetiradaCarregada] = useState({ chave: null, fotos: [] })
  const precisaCarregarRetirada =
    chaveDaRetirada !== null && retiradaCarregada.chave !== chaveDaRetirada

  // sai do histórico para o voltar do navegador não recarregar a proposta por cima do que foi editado
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
        // retirada em outra aba: recarregar o evento leva ao fluxo de reenvio, em vez de salvar e cair num 409
        if (detalhe.status === 'withdrawn') {
          toast.info('Esta proposta foi retirada', {
            descricao: 'O formulário vira um reenvio com os dados dela.',
          })
          recarregarEvento()
          return
        }
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
        // proposta que não existe mais (ex.: item apagado): recarrega o evento e a tela se ajusta
        if (erro.status === 404) {
          toast.info('Esta proposta não existe mais', {
            descricao: 'Confira o item no evento antes de continuar.',
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

  useEffect(() => {
    if (!precisaCarregarRetirada) return
    let telaAberta = true

    buscarMinhaProposta(chaveDaRetirada)
      .then((detalhe) => {
        if (!telaAberta) return
        // não sobrescreve o que já foi mudado nas etapas deste mesmo reenvio
        if (recarregarAoEntrar || lerRascunho(id, itemKey).chaveDaRetirada !== chaveDaRetirada) {
          setRascunho(
            atualizarRascunho(id, itemKey, {
              ...paraRascunho(detalhe),
              chaveDaRetirada,
            }),
          )
        }
        setRetiradaCarregada({ chave: chaveDaRetirada, fotos: detalhe.photos ?? [] })
        setRecarregarAoEntrar(false)
      })
      .catch((erro) => {
        if (telaAberta) setErroDaEdicao(erro)
      })

    return () => {
      telaAberta = false
    }
  }, [precisaCarregarRetirada, chaveDaRetirada, recarregarAoEntrar, id, itemKey, tentativaDaEdicao])

  function preencher(campo) {
    return (evento) => setRascunho(atualizarRascunho(id, itemKey, { [campo]: evento.target.value }))
  }

  return {
    eventKey: id,
    itemKey,
    carregando:
      evento.carregando || ((precisaCarregarProposta || precisaCarregarRetirada) && !erroDaEdicao),
    erro: evento.erro ?? erroDaEdicao,
    evento: evento.evento,
    item,
    editando: proposalKey !== null,
    proposalKey,
    reenviando: chaveDaRetirada !== null,
    recarregarEvento,
    fotosDaRetirada: retiradaCarregada.chave === chaveDaRetirada ? retiradaCarregada.fotos : [],
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
