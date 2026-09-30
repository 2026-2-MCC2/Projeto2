import { useState } from 'react'
import '../../styles/acessibilidade.css'

const DURACAO_DA_TROCA = 300

// O tema fica no atributo data-tema do <html>, definido no index.html e salvo no navegador.

export function BotaoTema() {
  const [tema, setTema] = useState(() => document.documentElement.dataset.tema)
  const escuro = tema === 'escuro'

  function alternar() {
    const raiz = document.documentElement
    const novoTema = escuro ? 'claro' : 'escuro'

    raiz.classList.add('trocando-tema')
    raiz.dataset.tema = novoTema
    setTimeout(() => raiz.classList.remove('trocando-tema'), DURACAO_DA_TROCA)

    try {
      localStorage.setItem('tema', novoTema)
    } catch {
      // Sem armazenamento, o tema vale só até recarregar a página.
    }
    setTema(novoTema)
  }

  return (
    <button
      type="button"
      className="acessibilidade acessibilidade--topo"
      aria-label={escuro ? 'Ativar modo claro' : 'Ativar modo escuro'}
      title={escuro ? 'Modo escuro' : 'Modo claro'}
      onClick={alternar}
    >
      <span aria-hidden="true">{escuro ? '🌙' : '☀️'}</span>
    </button>
  )
}
