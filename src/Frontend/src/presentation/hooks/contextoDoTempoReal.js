import { createContext } from 'react'

const nada = () => {}

// fora do provider (admin) as telas recebem valores parados, sem conexão
export const SEM_MENSAGENS = { total: 0, porProposta: {} }

export const ContextoDoTempoReal = createContext({
  conectado: false,
  notificacoesNaoLidas: 0,
  mensagensNaoLidas: SEM_MENSAGENS,
  assinar: () => nada,
  avisarDigitando: nada,
  atualizarContadores: () => Promise.resolve(),
  definirNotificacoesNaoLidas: nada,
})
