import { traduzirStatusDaProposta } from '../../../application/propostas.js'

// Etiqueta colorida com o status da proposta em português (Enviada, Em análise, Aceita, Recusada).
// A cor vem das classes minhas-propostas__situacao--<status da API> do fornecedor.css.
export function EtiquetaDaProposta({ status }) {
  return (
    <span className={`minhas-propostas__situacao minhas-propostas__situacao--${status}`}>
      {traduzirStatusDaProposta(status)}
    </span>
  )
}
