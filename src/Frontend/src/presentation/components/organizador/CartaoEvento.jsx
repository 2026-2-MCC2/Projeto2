import { Link } from 'react-router-dom'
import { STATUS_FRONTEND } from '../../../application/eventos.js'

export function CartaoEvento({ evento }) {
  const rotuloStatus = STATUS_FRONTEND[evento.status]?.nome ?? evento.status
  const estaCancelado = evento.status === 'cancelado'

  return (
    <Link to={`/organizador/eventos/${evento.id}`} className="evento" viewTransition>
      <span className={`etiqueta etiqueta--${evento.status}`}>{rotuloStatus}</span>

      <strong className="evento__nome">{evento.nome}</strong>

      <div className="evento__dados">
        <Dado rotulo="Período" valor={evento.periodo} />
        <Dado rotulo="Local" valor={evento.local} />
        <Dado rotulo="Público" valor={evento.publico} />
        {estaCancelado && (
          <Dado
            rotulo="Motivo"
            valor={evento.motivoDoCancelamento || 'Não informado'}
            destaquePerigo
          />
        )}
      </div>

      <div className="evento__ticket">
        <span>Ticket estimado</span>
        <strong>{evento.ticket}</strong>
      </div>
    </Link>
  )
}

export function CartaoEventoSkeleton() {
  return (
    <div className="evento evento--skeleton" aria-hidden="true">
      <span className="skeleton-bloco skeleton-bloco--etiqueta" />

      <div className="skeleton-bloco skeleton-bloco--titulo" />

      <div className="evento__dados">
        <div className="evento__dado">
          <span className="skeleton-bloco skeleton-bloco--rotulo" />
          <span className="skeleton-bloco skeleton-bloco--valor" />
        </div>
        <div className="evento__dado">
          <span className="skeleton-bloco skeleton-bloco--rotulo" />
          <span className="skeleton-bloco skeleton-bloco--valor" />
        </div>
        <div className="evento__dado">
          <span className="skeleton-bloco skeleton-bloco--rotulo" />
          <span className="skeleton-bloco skeleton-bloco--valor" />
        </div>
      </div>

      <div className="evento__ticket">
        <span className="skeleton-bloco skeleton-bloco--ticket-rotulo" />
        <span className="skeleton-bloco skeleton-bloco--ticket-valor" />
      </div>
    </div>
  )
}

function Dado({ rotulo, valor, destaquePerigo = false }) {
  return (
    <div className={`evento__dado${destaquePerigo ? ' evento__dado--perigo' : ''}`}>
      <span>{rotulo}</span>
      <strong title={valor}>{valor}</strong>
    </div>
  )
}

