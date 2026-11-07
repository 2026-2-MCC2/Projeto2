import { encerrarSessaoVencida, URL_BASE } from './api.js'
import { lerSessao } from './armazenamentoDaSessao.js'

const URL_DO_SOCKET = `${URL_BASE.replace(/^http/, 'ws')}/ws`

// sessão recusada pelo servidor (token inválido ou conta bloqueada): reconectar não adianta
const CODIGOS_SEM_RECONEXAO = [4401, 4403]
const ESPERA_INICIAL_MS = 1_000
const ESPERA_MAXIMA_MS = 30_000

// conexão do WebSocket com reconexão; aoMudarEstado recebe true só depois do "ready" do servidor
export function conectarTempoReal({ aoReceber, aoMudarEstado }) {
  let socket = null
  let espera = ESPERA_INICIAL_MS
  let temporizador = null
  let encerrado = false

  function abrir() {
    const token = lerSessao()?.token
    if (encerrado || !token) return

    socket = new WebSocket(URL_DO_SOCKET)
    socket.addEventListener('open', () => socket.send(JSON.stringify({ type: 'auth', token })))
    socket.addEventListener('message', (evento) => {
      const mensagem = lerJson(evento.data)
      if (!mensagem) return
      if (mensagem.type === 'ready') {
        espera = ESPERA_INICIAL_MS
        aoMudarEstado(true)
        return
      }
      aoReceber(mensagem)
    })
    socket.addEventListener('close', (evento) => {
      socket = null
      aoMudarEstado(false)
      if (encerrado) return
      if (CODIGOS_SEM_RECONEXAO.includes(evento.code)) {
        encerrado = true
        encerrarSessaoVencida()
        return
      }
      temporizador = setTimeout(abrir, espera)
      espera = Math.min(espera * 2, ESPERA_MAXIMA_MS)
    })
  }

  abrir()

  return {
    enviar(objeto) {
      if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(objeto))
    },
    fechar() {
      encerrado = true
      clearTimeout(temporizador)
      socket?.close(1000)
    },
  }
}

function lerJson(texto) {
  try {
    return JSON.parse(texto)
  } catch {
    return null
  }
}
