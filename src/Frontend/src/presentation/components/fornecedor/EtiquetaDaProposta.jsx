import { traduzirStatusDaProposta } from '../../../application/propostas.js'

export function EtiquetaDaProposta({ status }) {
  return (
    <span className={`minhas-propostas__situacao minhas-propostas__situacao--${status}`}>
      {traduzirStatusDaProposta(status)}
    </span>
  )
}
