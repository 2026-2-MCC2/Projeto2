import { useState } from 'react'
import { Icone } from './Icone.jsx'
import iconeOlho from '../../assets/comum/icone-olho.svg'
import iconeOlhoFechado from '../../assets/comum/icone-olho-fechado.svg'

export function EntradaDeSenha(props) {
  const [visivel, setVisivel] = useState(false)

  return (
    <span className="entrada-de-senha">
      <input {...props} type={visivel ? 'text' : 'password'} className="entrada-de-senha__campo" />
      <button
        type="button"
        className="entrada-de-senha__olho"
        aria-label={visivel ? 'Ocultar senha' : 'Mostrar senha'}
        aria-pressed={visivel}
        onClick={() => setVisivel((atual) => !atual)}
      >
        <Icone src={visivel ? iconeOlhoFechado : iconeOlho} />
      </button>
    </span>
  )
}
