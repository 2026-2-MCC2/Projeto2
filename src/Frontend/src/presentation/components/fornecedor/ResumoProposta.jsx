import { NOME_ITEM_PROPOSTA } from '../../data/propostaFornecedor.js'

const AVISO_PROPOSTA =
  'Confira os dados antes de enviar. Depois do envio, a edição depende da análise do organizador.'

export function ResumoProposta() {
  return (
    <section className="resumo-proposta" aria-labelledby="titulo-resumo-proposta">
      <h2 id="titulo-resumo-proposta">Sua proposta</h2>
      <strong className="resumo-proposta__valor">R$ 49.800,00</strong>
      <span className="resumo-proposta__diferenca">10,7% acima do previsto</span>
      <span className="resumo-proposta__validade">Válida até 30 Set 2026</span>
      <p>{AVISO_PROPOSTA}</p>
    </section>
  )
}

export function ResumoItemCotacao({ categoria }) {
  return (
    <section className="resumo-item-cotacao" aria-labelledby="titulo-item-cotacao">
      <h2 id="titulo-item-cotacao">Item em cotação</h2>
      <strong className="resumo-item-cotacao__nome">{NOME_ITEM_PROPOSTA}</strong>
      <div>
        <span>Categoria</span>
        <b>{categoria}</b>
      </div>
      <div>
        <span>Orçamento previsto</span>
        <b>R$ 45.000</b>
      </div>
      <div>
        <span>Prazo para envio</span>
        <b>25 Set 2026</b>
      </div>
    </section>
  )
}
