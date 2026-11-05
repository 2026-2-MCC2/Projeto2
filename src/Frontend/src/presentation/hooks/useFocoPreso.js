import { useEffect, useRef } from 'react'

const FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

// só os visíveis: o puxador da folha fica escondido no desktop
function focaveisDe(dialogo) {
  return [...dialogo.querySelectorAll(FOCAVEIS)].filter((item) => item.getClientRects().length)
}

// no Tab do último item volta ao primeiro (e no Shift+Tab do primeiro vai ao último)
export function manterTabDentro(evento, dialogo) {
  if (evento.key !== 'Tab') return

  const lista = focaveisDe(dialogo)
  if (!lista.length) return
  const primeiro = lista[0]
  const ultimo = lista[lista.length - 1]

  if (
    evento.shiftKey &&
    (document.activeElement === primeiro || document.activeElement === dialogo)
  ) {
    evento.preventDefault()
    ultimo.focus()
  } else if (!evento.shiftKey && document.activeElement === ultimo) {
    evento.preventDefault()
    primeiro.focus()
  }
}

// Foco de diálogo modal: entra no diálogo, fica preso nele no Tab e volta para quem o abriu.
export function useFocoPreso() {
  const caixa = useRef(null)

  useEffect(() => {
    const dialogo = caixa.current
    if (!dialogo) return

    const quemAbriu = document.activeElement
    const primeiroCampo = dialogo.querySelector('input, textarea, select')
    ;(primeiroCampo ?? focaveisDe(dialogo)[0] ?? dialogo).focus()

    const prenderTab = (evento) => manterTabDentro(evento, dialogo)
    dialogo.addEventListener('keydown', prenderTab)
    return () => {
      dialogo.removeEventListener('keydown', prenderTab)
      // quem abriu pode ter saído da tela (ex.: o X da foto apagada); aí quem chamou decide o foco
      if (quemAbriu?.isConnected) quemAbriu.focus?.()
    }
  }, [])

  return caixa
}
