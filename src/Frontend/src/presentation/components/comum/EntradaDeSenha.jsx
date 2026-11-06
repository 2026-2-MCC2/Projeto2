import { useId, useState } from 'react'
import { Icone } from './Icone.jsx'
import iconeOlho from '../../assets/comum/icone-olho.svg'
import iconeOlhoFechado from '../../assets/comum/icone-olho-fechado.svg'
import iconeAtencao from '../../assets/comum/icone-estado-atencao.svg'

export function EntradaDeSenha({
  onKeyDown,
  onKeyUp,
  onBlur,
  'aria-describedby': descritoPor,
  ...props
}) {
  const [visivel, setVisivel] = useState(false)
  // o ícone só pisca depois do primeiro clique, não ao abrir a tela
  const [alternou, setAlternou] = useState(false)
  const [capsLock, setCapsLock] = useState(false)
  const idDoAviso = useId()

  const lerCapsLock = (evento) => setCapsLock(evento.getModifierState('CapsLock'))

  return (
    <>
      <span className="entrada-de-senha">
        <input
          {...props}
          type={visivel ? 'text' : 'password'}
          className="entrada-de-senha__campo"
          aria-describedby={
            [descritoPor, capsLock && idDoAviso].filter(Boolean).join(' ') || undefined
          }
          onKeyDown={(evento) => {
            lerCapsLock(evento)
            onKeyDown?.(evento)
          }}
          onKeyUp={(evento) => {
            lerCapsLock(evento)
            onKeyUp?.(evento)
          }}
          onBlur={(evento) => {
            setCapsLock(false)
            onBlur?.(evento)
          }}
        />
        <button
          type="button"
          className={`entrada-de-senha__olho${alternou ? ' entrada-de-senha__olho--alternou' : ''}`}
          aria-label={visivel ? 'Ocultar senha' : 'Mostrar senha'}
          aria-pressed={visivel}
          onClick={() => {
            setVisivel((atual) => !atual)
            setAlternou(true)
          }}
        >
          {/* a key remonta o ícone a cada troca, e é isso que dispara a piscada */}
          <Icone key={String(visivel)} src={visivel ? iconeOlhoFechado : iconeOlho} />
        </button>
      </span>

      {capsLock && (
        <span id={idDoAviso} role="alert" className="entrada-de-senha__caps">
          <Icone src={iconeAtencao} />
          Caps Lock está ativado
        </span>
      )}
    </>
  )
}
