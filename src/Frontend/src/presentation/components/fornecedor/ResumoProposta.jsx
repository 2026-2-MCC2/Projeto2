import { formatarMoeda } from '../../../application/eventos.js'
import { formatarValidade } from '../../../application/propostas.js'
import { comparacaoComPrevisto, diaEmBrasilia } from '../../../domain/formatacao.js'
import { paraData, paraNumero } from '../../../domain/validacao.js'

const AVISO_PROPOSTA =
  'Confira os dados antes de enviar. Depois do envio, você pode editar ou retirar a proposta até o organizador analisar.'

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

// A validade não pode passar do fim do evento (mesma regra da API, que compara o dia de Brasília).
export function ResumoItemCotacao({ item, evento }) {
  const fimDoEvento = diaEmBrasilia(evento.end_date)

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
