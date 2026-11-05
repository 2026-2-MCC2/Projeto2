import { Link } from 'react-router-dom'

// "LP · Botão" do Figma: primario para a ação principal, secundario para as de apoio e
// contorno-claro sobre fundos escuros. Com `para` vira link de rota; sem, é um <button>.
export function BotaoLanding({ tipo = 'primario', para, className = '', children, ...resto }) {
  const classes = `botao-landing botao-landing--${tipo}${className ? ` ${className}` : ''}`

  if (para) {
    return (
      <Link to={para} className={classes} {...resto}>
        {children}
      </Link>
    )
  }

  return (
    <button type="button" className={classes} {...resto}>
      {children}
    </button>
  )
}
