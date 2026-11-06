import { useRef } from 'react'

const INTERVALO_MINIMO = 30_000

// os links vencem em 15 min; o intervalo evita um laço de pedidos para uma foto quebrada de verdade
export function useRenovarFotosVencidas(renovar) {
  const ultimaRenovacao = useRef(0)

  return () => {
    const agora = Date.now()
    if (agora - ultimaRenovacao.current < INTERVALO_MINIMO) return
    ultimaRenovacao.current = agora
    renovar()
  }
}
