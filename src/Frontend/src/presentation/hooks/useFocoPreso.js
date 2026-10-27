import { useEffect, useRef } from 'react'

const FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Foco de diálogo modal: entra no diálogo, fica preso nele no Tab e volta para quem o abriu.
export function useFocoPreso() {
  const caixa = useRef(null)

  useEffect(() => {
    const dialogo = caixa.current
    if (!dialogo) return

    const quemAbriu = document.activeElement
    // só os visíveis: o puxador da folha fica escondido no desktop
    const focaveis = () =>
      [...dialogo.querySelectorAll(FOCAVEIS)].filter((item) => item.getClientRects().length)
    const primeiroCampo = dialogo.querySelector('input, textarea, select')
    ;(primeiroCampo ?? focaveis()[0] ?? dialogo).focus()

    function prenderTab(evento) {
      if (evento.key !== 'Tab') return

      const lista = focaveis()
      if (!lista.length) return
      const primeiro = lista[0]
      const ultimo = lista[lista.length - 1]

      if (evento.shiftKey && document.activeElement === primeiro) {
        evento.preventDefault()
        ultimo.focus()
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault()
        primeiro.focus()
      }
    }

    dialogo.addEventListener('keydown', prenderTab)
    return () => {
      dialogo.removeEventListener('keydown', prenderTab)
      quemAbriu?.focus?.()
    }
  }, [])

  return caixa
}
