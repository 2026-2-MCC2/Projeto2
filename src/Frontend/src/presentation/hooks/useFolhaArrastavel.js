import { useRef, useState } from 'react'

// No mobile a folha acompanha o dedo: puxar para baixo fecha, puxar para cima expande.
export function useFolhaArrastavel(aoFechar) {
  const [expandida, setExpandida] = useState(false)
  const [arrasto, setArrasto] = useState(0)
  const inicio = useRef(null)
  const houveArrasto = useRef(false)

  function aoPegar(evento) {
    inicio.current = evento.clientY
    houveArrasto.current = false
    evento.currentTarget.setPointerCapture(evento.pointerId)
  }

  function aoArrastar(evento) {
    if (inicio.current === null) return

    const distancia = evento.clientY - inicio.current
    if (Math.abs(distancia) > 5) houveArrasto.current = true
    setArrasto(distancia)
  }

  function aoSoltar() {
    if (arrasto > 100) {
      if (expandida) setExpandida(false)
      else aoFechar()
    } else if (arrasto < -60) {
      setExpandida(true)
    }

    inicio.current = null
    setArrasto(0)
  }

  return {
    expandida,
    arrasto,
    estiloDoArrasto: arrasto ? { transform: `translateY(${Math.max(arrasto, -40)}px)` } : undefined,
    puxador: {
      onClick: () => !houveArrasto.current && aoFechar(),
      onPointerDown: aoPegar,
      onPointerMove: aoArrastar,
      onPointerUp: aoSoltar,
      onPointerCancel: aoSoltar,
    },
  }
}
