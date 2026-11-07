import { useCallback, useEffect, useRef, useState } from 'react'
import {
  buscarConversa,
  enviarMensagem,
  marcarConversaComoLida,
} from '../../infrastructure/conversas.js'
import { useAbaVisivel } from './useAbaVisivel.js'
import { useTempoReal } from './useTempoReal.jsx'

const CODIGO_DE_CONVERSA_ENCERRADA = 'EVP000050'
// proposta não encontrada (ex.: item apagado pelo organizador); a retirada vem pelo status 'withdrawn'
const CODIGO_DE_PROPOSTA_INEXISTENTE = 'EVP000033'
const naoExisteMais = (falha) => falha?.codigo === CODIGO_DE_PROPOSTA_INEXISTENTE
const DURACAO_DO_DIGITANDO_MS = 3_000

let proximaChaveTemporaria = 0

// conversa de uma proposta: carrega pela API, recebe pelo WebSocket e envia com resposta otimista
export function useConversa(chaveDaProposta) {
  const { assinar, avisarDigitando, atualizarContadores } = useTempoReal()
  const [conversa, setConversa] = useState(null)
  const [erro, setErro] = useState(null)
  const [tentativa, setTentativa] = useState(0)
  const [digitando, setDigitando] = useState(false)
  const [removida, setRemovida] = useState(false)
  const temporizadorDoDigitando = useRef(null)
  const leituraPendente = useRef(false)
  const abaVisivel = useAbaVisivel()

  const marcarComoLida = useCallback(async () => {
    try {
      await marcarConversaComoLida(chaveDaProposta)
      await atualizarContadores()
    } catch {
      // a marca de lida não impede ler a conversa; tenta de novo na próxima mensagem
    }
  }, [chaveDaProposta, atualizarContadores])

  // só leitura e sem as mensagens que não chegaram a ser enviadas
  const encerrarPorRemocao = useCallback(() => {
    setRemovida(true)
    setErro(null)
    setConversa(
      (anterior) =>
        anterior && {
          ...anterior,
          can_send: false,
          data: anterior.data.filter((mensagem) => !mensagem.estado),
        },
    )
  }, [])

  // com a aba escondida ninguém está lendo: marca quando ela voltar a ficar visível
  const lerSeEstiverVendo = useCallback(() => {
    if (document.visibilityState === 'visible') marcarComoLida()
    else leituraPendente.current = true
  }, [marcarComoLida])

  useEffect(() => {
    if (!abaVisivel || !leituraPendente.current) return
    leituraPendente.current = false
    marcarComoLida()
  }, [abaVisivel, marcarComoLida])

  useEffect(() => {
    let aberta = true
    buscarConversa(chaveDaProposta)
      .then((resposta) => {
        if (!aberta) return
        setConversa((anterior) => ({
          ...resposta,
          data: [...resposta.data, ...pendentes(anterior, chaveDaProposta)],
        }))
        setErro(null)
        lerSeEstiverVendo()
      })
      .catch((falha) => {
        if (!aberta) return
        if (naoExisteMais(falha)) encerrarPorRemocao()
        else setErro(falha)
      })
    return () => {
      aberta = false
    }
  }, [chaveDaProposta, tentativa, lerSeEstiverVendo, encerrarPorRemocao])

  // quem manda mensagem ou digita está com a conversa aberta, e abrir marca as minhas como lidas
  const outroLadoLeu = useCallback(() => {
    setConversa(
      (anterior) =>
        anterior && {
          ...anterior,
          counterpart: { ...anterior.counterpart, online: true },
          data: anterior.data.map((mensagem) =>
            mensagem.mine && !mensagem.estado ? { ...mensagem, read: true } : mensagem,
          ),
        },
    )
  }, [])

  useEffect(() => {
    const pararDeMostrarDigitando = () => {
      clearTimeout(temporizadorDoDigitando.current)
      setDigitando(false)
    }

    const cancelarMensagem = assinar('message', ({ proposal_key, message }) => {
      if (proposal_key !== chaveDaProposta) return
      if (!message.mine) {
        pararDeMostrarDigitando()
        outroLadoLeu()
        lerSeEstiverVendo()
      }
      setConversa((anterior) => anterior && { ...anterior, data: incluir(anterior.data, message) })
    })
    const cancelarDigitando = assinar('typing', ({ proposal_key }) => {
      if (proposal_key !== chaveDaProposta) return
      outroLadoLeu()
      setDigitando(true)
      clearTimeout(temporizadorDoDigitando.current)
      temporizadorDoDigitando.current = setTimeout(
        () => setDigitando(false),
        DURACAO_DO_DIGITANDO_MS,
      )
    })
    const cancelarLeitura = assinar('read', ({ proposal_key }) => {
      if (proposal_key === chaveDaProposta) outroLadoLeu()
    })
    const cancelarReconexao = assinar('reconectado', () => setTentativa((valor) => valor + 1))

    return () => {
      cancelarMensagem()
      cancelarDigitando()
      cancelarLeitura()
      cancelarReconexao()
      clearTimeout(temporizadorDoDigitando.current)
    }
  }, [assinar, chaveDaProposta, lerSeEstiverVendo, outroLadoLeu])

  const atualizarMensagem = useCallback((chave, mudanca) => {
    setConversa(
      (anterior) =>
        anterior && {
          ...anterior,
          data: anterior.data.map((mensagem) =>
            mensagem.message_key === chave ? { ...mensagem, ...mudanca } : mensagem,
          ),
        },
    )
  }, [])

  const mandar = useCallback(
    async (texto, chaveTemporaria) => {
      try {
        const criada = await enviarMensagem(chaveDaProposta, texto)
        setConversa(
          (anterior) =>
            anterior && {
              ...anterior,
              data: incluir(
                anterior.data.filter((mensagem) => mensagem.message_key !== chaveTemporaria),
                criada,
              ),
            },
        )
      } catch (falha) {
        if (naoExisteMais(falha)) {
          encerrarPorRemocao()
          return
        }
        if (falha.codigo === CODIGO_DE_CONVERSA_ENCERRADA) {
          setConversa((anterior) => anterior && { ...anterior, can_send: false })
          setTentativa((valor) => valor + 1)
        }
        atualizarMensagem(chaveTemporaria, { estado: 'erro' })
      }
    },
    [chaveDaProposta, atualizarMensagem, encerrarPorRemocao],
  )

  const enviar = useCallback(
    (texto) => {
      proximaChaveTemporaria += 1
      const chaveTemporaria = `enviando-${proximaChaveTemporaria}`
      const pendente = {
        message_key: chaveTemporaria,
        body: texto,
        mine: true,
        read: false,
        created_at: new Date().toISOString(),
        estado: 'enviando',
      }
      setConversa((anterior) => anterior && { ...anterior, data: [...anterior.data, pendente] })
      mandar(texto, chaveTemporaria)
    },
    [mandar],
  )

  const tentarDeNovo = useCallback(
    (mensagem) => {
      atualizarMensagem(mensagem.message_key, { estado: 'enviando' })
      mandar(mensagem.body, mensagem.message_key)
    },
    [atualizarMensagem, mandar],
  )

  return {
    conversa,
    removida,
    erro,
    digitando,
    enviar,
    tentarDeNovo,
    avisarDigitando: () => avisarDigitando(chaveDaProposta),
    recarregar: () => setTentativa((valor) => valor + 1),
  }
}

// o envio pode voltar pelo WebSocket antes da resposta do POST: a mensagem entra uma vez só
function incluir(mensagens, nova) {
  if (mensagens.some((mensagem) => mensagem.message_key === nova.message_key)) return mensagens
  const indiceDoPendente = nova.mine
    ? mensagens.findIndex(
        (mensagem) => mensagem.estado === 'enviando' && mensagem.body === nova.body,
      )
    : -1
  if (indiceDoPendente === -1) return [...mensagens, nova]
  return mensagens.map((mensagem, indice) => (indice === indiceDoPendente ? nova : mensagem))
}

// ao recarregar, as mensagens que ainda não chegaram ao servidor continuam na tela (só da mesma proposta)
function pendentes(conversa, chaveDaProposta) {
  if (conversa?.proposal?.proposal_key !== chaveDaProposta) return []
  return conversa.data.filter((mensagem) => mensagem.estado)
}
