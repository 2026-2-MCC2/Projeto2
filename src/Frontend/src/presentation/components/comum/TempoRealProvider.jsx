import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { buscarMensagensNaoLidas } from '../../../infrastructure/conversas.js'
import { listarNotificacoes } from '../../../infrastructure/notificacoes.js'
import { conectarTempoReal } from '../../../infrastructure/tempoReal.js'
import { ContextoDoTempoReal, SEM_MENSAGENS } from '../../hooks/contextoDoTempoReal.js'
import { useAbaVisivel } from '../../hooks/useAbaVisivel.js'

const INTERVALO_DO_DIGITANDO_MS = 1_000

// uma conexão por aba para notificações, mensagens e "digitando"; os contadores ficam aqui para o menu e as telas
// o admin só tem notificações: a rota de mensagens responderia 403 para ele
export function TempoRealProvider({ comMensagens = true, children }) {
  const [conectado, setConectado] = useState(false)
  const [notificacoesNaoLidas, definirNotificacoesNaoLidas] = useState(0)
  const [mensagensNaoLidas, setMensagensNaoLidas] = useState(SEM_MENSAGENS)
  const assinantes = useRef(new Map())
  const conexao = useRef(null)
  const ultimoDigitando = useRef(0)
  const jaConectou = useRef(false)

  const emitir = useCallback((tipo, dados) => {
    assinantes.current.get(tipo)?.forEach((callback) => callback(dados))
  }, [])

  const assinar = useCallback((tipo, callback) => {
    if (!assinantes.current.has(tipo)) assinantes.current.set(tipo, new Set())
    assinantes.current.get(tipo).add(callback)
    return () => assinantes.current.get(tipo)?.delete(callback)
  }, [])

  const atualizarContadores = useCallback(async () => {
    try {
      const [notificacoes, mensagens] = await Promise.all([
        listarNotificacoes({ limite: 1 }),
        comMensagens ? buscarMensagensNaoLidas() : { total: 0, by_proposal: {} },
      ])
      definirNotificacoesNaoLidas(notificacoes.unread_count)
      setMensagensNaoLidas({ total: mensagens.total, porProposta: mensagens.by_proposal })
    } catch {
      // sem conexão com a API: os contadores ficam como estão até a próxima tentativa
    }
  }, [comMensagens])

  const receber = useCallback(
    (mensagem) => {
      if (mensagem.type === 'notification') {
        definirNotificacoesNaoLidas((anterior) => anterior + 1)
      } else if (mensagem.type === 'notifications_changed') {
        // lidas por outro caminho (decisão de outro admin, conversa lida em outra aba)
        atualizarContadores()
      } else if (mensagem.type === 'message' && !mensagem.message?.mine) {
        setMensagensNaoLidas((anterior) => ({
          total: anterior.total + 1,
          porProposta: {
            ...anterior.porProposta,
            [mensagem.proposal_key]: (anterior.porProposta[mensagem.proposal_key] ?? 0) + 1,
          },
        }))
      }
      emitir(mensagem.type, mensagem)
    },
    [emitir, atualizarContadores],
  )

  // os contadores vêm da API a cada conexão; depois de uma queda (ou deploy) as telas também buscam de novo
  const mudarEstado = useCallback(
    (ligado) => {
      setConectado(ligado)
      if (!ligado) return
      atualizarContadores()
      if (jaConectou.current) emitir('reconectado')
      jaConectou.current = true
    },
    [atualizarContadores, emitir],
  )

  useEffect(() => {
    const atual = conectarTempoReal({ aoReceber: receber, aoMudarEstado: mudarEstado })
    conexao.current = atual
    return () => {
      atual.fechar()
      conexao.current = null
    }
  }, [atualizarContadores, receber, mudarEstado])

  const abaVisivel = useAbaVisivel()
  const abaJaFoiEscondida = useRef(false)
  useEffect(() => {
    if (!abaVisivel) {
      abaJaFoiEscondida.current = true
      return
    }
    if (!abaJaFoiEscondida.current) return
    atualizarContadores()
    emitir('reconectado')
  }, [abaVisivel, atualizarContadores, emitir])

  const avisarDigitando = useCallback((chaveDaProposta) => {
    const agora = Date.now()
    if (agora - ultimoDigitando.current < INTERVALO_DO_DIGITANDO_MS) return
    ultimoDigitando.current = agora
    conexao.current?.enviar({ type: 'typing', proposal_key: chaveDaProposta })
  }, [])

  const valor = useMemo(
    () => ({
      conectado,
      notificacoesNaoLidas,
      mensagensNaoLidas,
      assinar,
      avisarDigitando,
      atualizarContadores,
      definirNotificacoesNaoLidas,
    }),
    [
      conectado,
      notificacoesNaoLidas,
      mensagensNaoLidas,
      assinar,
      avisarDigitando,
      atualizarContadores,
    ],
  )

  return <ContextoDoTempoReal.Provider value={valor}>{children}</ContextoDoTempoReal.Provider>
}
