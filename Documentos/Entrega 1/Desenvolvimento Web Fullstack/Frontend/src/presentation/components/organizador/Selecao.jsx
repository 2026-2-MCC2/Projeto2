import { useEffect, useRef, useState } from 'react'

// Campo de seleção montado com botões, porque o <select> do navegador não deixa estilizar a lista aberta.

export function Selecao({ valor, opcoes, aoEscolher, rotuloAcessivel }) {
  const [aberto, setAberto] = useState(false)
  const caixa = useRef(null)

  const escolhida = opcoes.find((opcao) => opcao.valor === valor)

  // Fecha a lista ao clicar fora dela ou ao apertar Esc.
  useEffect(() => {
    if (!aberto) return

    function aoClicarFora(evento) {
      if (!caixa.current?.contains(evento.target)) setAberto(false)
    }

    function aoTeclar(evento) {
      if (evento.key === 'Escape') setAberto(false)
    }

    document.addEventListener('mousedown', aoClicarFora)
    document.addEventListener('keydown', aoTeclar)

    return () => {
      document.removeEventListener('mousedown', aoClicarFora)
      document.removeEventListener('keydown', aoTeclar)
    }
  }, [aberto])

  function escolher(opcao) {
    aoEscolher(opcao.valor)
    setAberto(false)
  }

  return (
    <div className="selecao" ref={caixa}>
      <button
        type="button"
        className="selecao__campo"
        aria-haspopup="listbox"
        aria-expanded={aberto}
        aria-label={rotuloAcessivel}
        onClick={() => setAberto((estava) => !estava)}
      >
        {escolhida ? escolhida.nome : 'Selecione'}
      </button>

      {aberto && (
        <ul className="selecao__lista" role="listbox">
          {opcoes.map((opcao) => (
            <li key={opcao.valor}>
              <button
                type="button"
                role="option"
                aria-selected={opcao.valor === valor}
                className={`selecao__opcao${opcao.valor === valor ? ' selecao__opcao--ativa' : ''}`}
                onClick={() => escolher(opcao)}
              >
                {opcao.nome}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
