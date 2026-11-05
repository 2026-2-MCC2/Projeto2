import { traduzirStatusDaProposta } from '../../../application/propostas.js'

// Etiqueta colorida com o status da proposta em português (Enviada, Em análise, Aceita, Recusada).
// A cor vem das classes minhas-propostas__situacao--* do fornecedor.css.
export function EtiquetaDaProposta({ status }) {
  const situacao = traduzirStatusDaProposta(status)
  const classe = situacao.toLocaleLowerCase('pt-BR').replace(' ', '-')

  return (
    <span className={`minhas-propostas__situacao minhas-propostas__situacao--${classe}`}>
      {situacao}
    </span>
  )
}
