import { useCallback, useEffect, useRef, useState } from 'react'
import {
  listarNotificacoes,
  marcarNotificacaoComoLida,
  marcarTodasComoLidas,
} from '../../infrastructure/notificacoes.js'
import { useTempoReal } from './useTempoReal.jsx'

// lista do painel e da página: a que chega pelo WebSocket entra no topo; ao reconectar, busca de novo
export function useNotificacoes({ limite = 20 } = {}) {
  const { assinar, definirNotificacoesNaoLidas } = useTempoReal()
  const [itens, setItens] = useState([])
  const [proximoCursor, setProximoCursor] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [carregandoMais, setCarregandoMais] = useState(false)
  const [erro, setErro] = useState(null)
  const montado = useRef(true)
  const [tentativa, setTentativa] = useState(0)
  // estável entre renders: entra nas dependências do efeito do WebSocket
  const carregar = useCallback(() => setTentativa((valor) => valor + 1), [])

  useEffect(() => {
    montado.current = true
    return () => {
      montado.current = false
    }
  }, [])

  // atual vale só para esta execução: a resposta de uma busca já substituída é ignorada
  useEffect(() => {
    let atual = true
    listarNotificacoes({ limite })
      .then((pagina) => {
        if (!atual) return
        setErro(null)
        setItens(pagina.data)
        setProximoCursor(pagina.next_cursor)
        definirNotificacoesNaoLidas(pagina.unread_count)
      })
      .catch((falha) => {
        if (atual) setErro(falha)
      })
      .finally(() => {
        if (atual) setCarregando(false)
      })
    return () => {
      atual = false
    }
  }, [limite, definirNotificacoesNaoLidas, tentativa])

  useEffect(() => {
    const pararNotificacao = assinar('notification', ({ notification }) => {
      setItens((anteriores) =>
        anteriores.some((item) => item.notification_key === notification.notification_key)
          ? anteriores
          : [notification, ...anteriores],
      )
    })
    const pararReconexao = assinar('reconectado', carregar)
    const pararMudanca = assinar('notifications_changed', carregar)
    return () => {
      pararNotificacao()
      pararReconexao()
      pararMudanca()
    }
  }, [assinar, carregar])

  async function carregarMais() {
    if (!proximoCursor || carregandoMais) return
    setCarregandoMais(true)
    try {
      const pagina = await listarNotificacoes({ limite, depois: proximoCursor })
      if (!montado.current) return
      setItens((anteriores) => [
        ...anteriores,
        ...pagina.data.filter(
          (nova) => !anteriores.some((item) => item.notification_key === nova.notification_key),
        ),
      ])
      setProximoCursor(pagina.next_cursor)
    } catch (falha) {
      if (montado.current) setErro(falha)
    } finally {
      if (montado.current) setCarregandoMais(false)
    }
  }

  // marca na tela antes da resposta; se a API falhar, a próxima busca acerta o estado
  function marcarComoLida(notificacao) {
    if (notificacao.read) return
    setItens((anteriores) =>
      anteriores.map((item) =>
        item.notification_key === notificacao.notification_key ? { ...item, read: true } : item,
      ),
    )
    definirNotificacoesNaoLidas((total) => Math.max(0, total - 1))
    marcarNotificacaoComoLida(notificacao.notification_key).catch(carregar)
  }

  function marcarTodas() {
    setItens((anteriores) => anteriores.map((item) => ({ ...item, read: true })))
    definirNotificacoesNaoLidas(0)
    marcarTodasComoLidas().catch(carregar)
  }

  return {
    itens,
    carregando,
    carregandoMais,
    erro,
    temMais: Boolean(proximoCursor),
    carregar,
    carregarMais,
    marcarComoLida,
    marcarTodas,
  }
}
