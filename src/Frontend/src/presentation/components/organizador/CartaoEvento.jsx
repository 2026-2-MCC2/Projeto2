import { Link } from 'react-router-dom'
import { STATUS } from '../../data/eventos.js'

export function CartaoEvento({ evento }) {
  return (
    <Link to={`/organizador/eventos/${evento.id}`} className="evento">
      <span className={`etiqueta etiqueta--${evento.status}`}>{STATUS[evento.status].nome}</span>

      <strong className="evento__nome">{evento.nome}</strong>

      <div className="evento__dados">
        <Dado rotulo="Período" valor={evento.periodo} />
        <Dado rotulo="Local" valor={evento.local} />
        <Dado rotulo="Público" valor={evento.publico} />
      </div>

      <div className="evento__ticket">
        <span>Ticket estimado</span>
        <strong>{evento.ticket}</strong>
      </div>
    </Link>
  )
}

function Dado({ rotulo, valor }) {
  return (
    <div className="evento__dado">
      <span>{rotulo}</span>
      <strong>{valor}</strong>
    </div>
  )
}
