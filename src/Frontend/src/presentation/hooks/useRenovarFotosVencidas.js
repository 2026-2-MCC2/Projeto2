import { useRef } from 'react'

const INTERVALO_MINIMO = 30_000

// Os links das fotos vencem (15 min na API). Quando uma imagem não carrega, a tela busca links novos,
// no máximo uma vez a cada 30 s para uma foto quebrada de verdade não virar um laço de pedidos.
//   const aoFalharFoto = useRenovarFotosVencidas(() => setTentativa((valor) => valor + 1))
//   <img src={foto.url} onError={aoFalharFoto} />
export function useRenovarFotosVencidas(renovar) {
  const ultimaRenovacao = useRef(0)

  return () => {
    const agora = Date.now()
    if (agora - ultimaRenovacao.current < INTERVALO_MINIMO) return
    ultimaRenovacao.current = agora
    renovar()
  }
}
