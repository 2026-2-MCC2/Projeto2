import { formatarMoeda } from '../../../application/eventos.js'
import { formatarValidade } from '../../../application/propostas.js'
import { paraData, paraNumero } from '../../../domain/validacao.js'

const AVISO_PROPOSTA =
  'Confira os dados antes de enviar. Depois do envio, você pode editar ou retirar a proposta até o organizador analisar.'

// "15% acima do previsto" · "8% abaixo do previsto" · null quando falta um dos valores
function comparacaoComPrevisto(valor, previsto) {
  if (!(valor > 0) || !(previsto > 0)) return null
  const diferenca = ((valor - previsto) / previsto) * 100
  if (Math.abs(diferenca) < 0.05) return 'Igual ao previsto'

  const percentual = Math.abs(diferenca).toLocaleString('pt-BR', { maximumFractionDigits: 1 })
  return `${percentual}% ${diferenca > 0 ? 'acima' : 'abaixo'} do previsto`
}

// o que o fornecedor já preencheu nas etapas (application/rascunhosDePropostas.js)
export function ResumoProposta({ rascunho, item }) {
  const valor = paraNumero(rascunho.valor)
  const comparacao = comparacaoComPrevisto(valor, Number(item.estimated_value))

  return (
    <section className="resumo-proposta" aria-labelledby="titulo-resumo-proposta">
      <h2 id="titulo-resumo-proposta">Sua proposta</h2>
      <strong className="resumo-proposta__valor">
        {valor > 0 ? formatarMoeda(valor) : 'Valor a definir'}
      </strong>
      {comparacao && <span className="resumo-proposta__diferenca">{comparacao}</span>}
      <span className="resumo-proposta__validade">
        {paraData(rascunho.validade) ? `Válida até ${rascunho.validade}` : 'Validade a definir'}
      </span>
      <p>{AVISO_PROPOSTA}</p>
    </section>
  )
}

// A validade não pode passar do fim do evento (mesma regra da API, que compara o dia em UTC).
export function ResumoItemCotacao({ item, evento }) {
  const fimDoEvento = new Date(evento.end_date).toISOString().slice(0, 10)

  return (
    <section className="resumo-item-cotacao" aria-labelledby="titulo-item-cotacao">
      <h2 id="titulo-item-cotacao">Item em cotação</h2>
      <strong className="resumo-item-cotacao__nome">{item.description}</strong>
      <div>
        <span>Categoria</span>
        <b>{item.category}</b>
      </div>
      <div>
        <span>Orçamento previsto</span>
        <b>
          {item.estimated_value == null ? 'Não informado' : formatarMoeda(item.estimated_value)}
        </b>
      </div>
      <div>
        <span>Validade até</span>
        <b>{formatarValidade(fimDoEvento)}</b>
      </div>
    </section>
  )
}
