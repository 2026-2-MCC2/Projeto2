import { useEffect, useId, useRef, useState } from 'react'

// Campo de seleção montado com botões, porque o <select> do navegador não deixa estilizar a lista aberta.
// Padrão "select-only combobox" da WAI-ARIA: o foco fica no botão e as setas andam pelas opções.

export function Selecao({ valor, opcoes, aoEscolher, rotuloAcessivel }) {
  const [aberto, setAberto] = useState(false)
  const [destacada, setDestacada] = useState(0)
  const caixa = useRef(null)
  const id = useId()

  const indiceEscolhido = opcoes.findIndex((opcao) => opcao.valor === valor)
  const escolhida = opcoes[indiceEscolhido]

  // Fecha a lista ao clicar fora dela.
  useEffect(() => {
    if (!aberto) return

    function aoClicarFora(evento) {
      if (!caixa.current?.contains(evento.target)) setAberto(false)
    }

    document.addEventListener('mousedown', aoClicarFora)
    return () => document.removeEventListener('mousedown', aoClicarFora)
  }, [aberto])

  function abrir() {
    setDestacada(Math.max(indiceEscolhido, 0))
    setAberto(true)
  }

  function escolher(indice) {
    aoEscolher(opcoes[indice].valor)
    setAberto(false)
  }

  function aoTeclar(evento) {
    const ultima = opcoes.length - 1

    if (!aberto) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(evento.key)) {
        evento.preventDefault()
        abrir()
      }
      return
    }

    const acoes = {
      ArrowDown: () => setDestacada((atual) => Math.min(atual + 1, ultima)),
      ArrowUp: () => setDestacada((atual) => Math.max(atual - 1, 0)),
      Home: () => setDestacada(0),
      End: () => setDestacada(ultima),
      Enter: () => escolher(destacada),
      ' ': () => escolher(destacada),
      Escape: () => setAberto(false),
    }

    if (evento.key === 'Tab') {
      setAberto(false)
    } else if (acoes[evento.key]) {
      evento.preventDefault()
      // Esc fecha só a lista, sem fechar um modal em volta
      if (evento.key === 'Escape') evento.stopPropagation()
      acoes[evento.key]()
    }
  }

  return (
    <div className="selecao" ref={caixa}>
      <button
        type="button"
        role="combobox"
        className="selecao__campo"
        aria-haspopup="listbox"
        aria-expanded={aberto}
        aria-controls={`${id}-lista`}
        aria-activedescendant={aberto ? `${id}-opcao-${destacada}` : undefined}
        aria-label={`${rotuloAcessivel}: ${escolhida ? escolhida.nome : 'nenhuma opção'}`}
        onClick={() => (aberto ? setAberto(false) : abrir())}
        onKeyDown={aoTeclar}
        // no Firefox o Espaço aciona o botão ao soltar a tecla; a escolha já foi feita no keydown
        onKeyUp={(evento) => evento.key === ' ' && evento.preventDefault()}
      >
        {escolhida ? escolhida.nome : 'Selecione'}
      </button>

      {aberto && (
        <ul
          id={`${id}-lista`}
          className="selecao__lista"
          role="listbox"
          aria-label={rotuloAcessivel}
        >
          {opcoes.map((opcao, indice) => (
            <li
              key={opcao.valor}
              id={`${id}-opcao-${indice}`}
              role="option"
              aria-selected={indice === indiceEscolhido}
              className={`selecao__opcao${indice === indiceEscolhido ? ' selecao__opcao--ativa' : ''}${indice === destacada ? ' selecao__opcao--destacada' : ''}`}
              onMouseDown={(evento) => evento.preventDefault()}
              onClick={() => escolher(indice)}
            >
              {opcao.nome}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
