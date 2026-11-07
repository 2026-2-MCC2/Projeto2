import { useState } from 'react'

// [ativo, eventos]: mouse em cima (só em aparelho com mouse) ou foco de teclado visível,
// para um toque na tela não deixar o efeito preso
export function useMouseOuFoco() {
  const [comMouse, setComMouse] = useState(false)
  const [comFoco, setComFoco] = useState(false)

  const eventos = {
    onMouseEnter: () =>
      setComMouse(window.matchMedia('(hover: hover) and (pointer: fine)').matches),
    onMouseLeave: () => setComMouse(false),
    onFocus: (evento) => setComFoco(evento.currentTarget.matches(':focus-visible')),
    onBlur: () => setComFoco(false),
  }

  return [comMouse || comFoco, eventos]
}
