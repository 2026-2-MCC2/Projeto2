import { useState } from 'react'

// Diz se um elemento está com o mouse em cima ou com foco de teclado. Devolve [ativo, eventos];
// os eventos vão no próprio elemento. Mouse só conta em aparelho com mouse de verdade, e o foco só
// quando é visível (teclado), para um toque na tela não deixar o efeito preso.
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
