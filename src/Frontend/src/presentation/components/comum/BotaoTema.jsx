import { useAcessibilidade } from '../../hooks/useAcessibilidade.js'
import { Icone } from './Icone.jsx'
import iconeSol from '../../assets/comum/icone-sol.svg'
import iconeLua from '../../assets/comum/icone-lua.svg'
import '../../styles/acessibilidade.css'

// mostra o ícone do tema de destino: lua no claro, sol no escuro
export function BotaoTema({ posicao = 'topo' }) {
  const { tema, mudarTema } = useAcessibilidade()
  const escuro = tema === 'escuro'

  return (
    <button
      type="button"
      className={`botao-tema botao-tema--${posicao}`}
      aria-label={escuro ? 'Ativar tema claro' : 'Ativar tema escuro'}
      title={escuro ? 'Ativar tema claro' : 'Ativar tema escuro'}
      onClick={() => mudarTema(escuro ? 'claro' : 'escuro')}
    >
      <Icone src={escuro ? iconeSol : iconeLua} />
    </button>
  )
}

// Controle segmentado do painel de Acessibilidade.
export function SeletorTema() {
  const { tema, mudarTema } = useAcessibilidade()
  const opcoes = [
    { valor: 'claro', nome: 'Claro', icone: iconeSol },
    { valor: 'escuro', nome: 'Escuro', icone: iconeLua },
  ]

  // Como em todo radiogroup, as setas trocam a opção e o Tab entra só na opção marcada.
  function aoTeclar(evento) {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(evento.key)) return
    evento.preventDefault()
    const outra = opcoes.find((opcao) => opcao.valor !== tema)
    mudarTema(outra.valor)
    evento.currentTarget.querySelector(`[data-valor="${outra.valor}"]`)?.focus()
  }

  return (
    <div className="seletor-tema" role="radiogroup" aria-label="Tema" onKeyDown={aoTeclar}>
      {opcoes.map((opcao) => {
        const ativa = tema === opcao.valor
        return (
          <button
            key={opcao.valor}
            type="button"
            role="radio"
            data-valor={opcao.valor}
            tabIndex={ativa ? 0 : -1}
            aria-checked={ativa}
            className={`seletor-tema__opcao${ativa ? ' seletor-tema__opcao--ativa' : ''}`}
            onClick={() => mudarTema(opcao.valor)}
          >
            <Icone src={opcao.icone} />
            {opcao.nome}
          </button>
        )
      })}
    </div>
  )
}
