import { useCallback, useEffect, useRef, useState } from 'react'
import { listarConversas } from '../../infrastructure/conversas.js'
import { useTempoReal } from './useTempoReal.jsx'

// lista da aba Chats; mensagem nova sobe a conversa para o topo sem esperar a API
// chaveAberta: conversa aberta na gaveta, que não soma não lidas (a gaveta já marca como lida)
export function useConversas(chaveAberta = null) {
  const { assinar } = useTempoReal()
  const [estado, setEstado] = useState({ itens: [], carregando: true, erro: null })
  const [tentativa, setTentativa] = useState(0)
  const ultimaBusca = useRef(0)
  const itensAtuais = useRef(estado.itens)
  const conversaAberta = useRef(chaveAberta)
  const recarregar = useCallback(() => setTentativa((valor) => valor + 1), [])

  useEffect(() => {
    itensAtuais.current = estado.itens
    conversaAberta.current = chaveAberta
  })

  useEffect(() => {
    // só a busca mais recente vale: uma resposta atrasada não sobrescreve a lista nova
    const busca = ++ultimaBusca.current
    listarConversas()
      .then((resposta) => {
        if (busca === ultimaBusca.current)
          setEstado({ itens: resposta.data, carregando: false, erro: null })
      })
      .catch((erro) => {
        if (busca === ultimaBusca.current)
          setEstado((anterior) => ({ ...anterior, carregando: false, erro }))
      })
  }, [tentativa])

  useEffect(() => {
    const cancelarMensagem = assinar('message', ({ proposal_key, message }) => {
      // conversa que ainda não está na lista: busca de novo (decidido fora do updater, que deve ser puro)
      if (!itensAtuais.current.some((item) => item.proposal_key === proposal_key)) {
        recarregar()
        return
      }
      const somaNaoLida = !message.mine && proposal_key !== conversaAberta.current
      setEstado((anterior) => {
        const atual = anterior.itens.find((item) => item.proposal_key === proposal_key)
        if (!atual) return anterior
        const atualizada = {
          ...atual,
          last_message: {
            body: message.body,
            mine: message.mine,
            created_at: message.created_at,
            read: message.read,
          },
          unread: somaNaoLida ? atual.unread + 1 : atual.unread,
        }
        const outras = anterior.itens.filter((item) => item.proposal_key !== proposal_key)
        return { ...anterior, itens: [atualizada, ...outras] }
      })
    })
    const cancelamentos = ['read', 'reconectado', 'notifications_changed'].map((tipo) =>
      assinar(tipo, recarregar),
    )
    return () => {
      cancelarMensagem()
      cancelamentos.forEach((cancelar) => cancelar())
    }
  }, [assinar, recarregar])

  // abrir a conversa marca como lidas: o contador da linha zera na hora
  const zerarNaoLidas = useCallback((chave) => {
    setEstado((anterior) => ({
      ...anterior,
      itens: anterior.itens.map((item) =>
        item.proposal_key === chave ? { ...item, unread: 0 } : item,
      ),
    }))
  }, [])

  return { ...estado, recarregar, zerarNaoLidas }
}
