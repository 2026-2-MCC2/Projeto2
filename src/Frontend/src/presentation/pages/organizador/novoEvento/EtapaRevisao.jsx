import { nomeDoCenario } from './cenarios.js'

export function EtapaRevisao({ dados, isMobile }) {
  const periodo = [dados.dataInicio, dados.dataTermino].filter(Boolean).join(' a ')
  const custosProprios = [dados.custosFiscais, dados.equipeProducao, dados.outrosCustos]
    .filter(Boolean)
    .join(' + ')

  if (isMobile) {
    return (
      <>
        <div className="resumo resumo--cartao">
          <DadoResumo rotulo="Evento" valor={dados.nome} />
          <DadoResumo rotulo="Período" valor={periodo} />
          <DadoResumo
            rotulo="Local"
            valor={[dados.nomeEspaco, dados.estado].filter(Boolean).join(', ')}
          />
          <DadoResumo rotulo="Público esperado" valor={dados.publicoEsperado} />
          <DadoResumo rotulo="Margem de lucro" valor={dados.margemLucro} />
          <DadoResumo rotulo="Custos próprios" valor={custosProprios} />
        </div>

        <div className="preveia-ticket preveia-ticket--mobile">
          <p className="preveia-ticket__titulo">Prévia do ticket no público esperado</p>
          <strong>—</strong>
          <p className="preveia-ticket__apoio">{APOIO_PREVIA}</p>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="resumo">
        <BlocoResumo titulo="Dados do evento">
          <DadoResumo rotulo="Nome" valor={dados.nome} />
          <DadoResumo rotulo="Categoria" valor={dados.categoria} />
          <DadoResumo rotulo="Período" valor={periodo} />
        </BlocoResumo>

        <BlocoResumo titulo="Local e público">
          <DadoResumo
            rotulo="Espaço"
            valor={[dados.nomeEspaco, dados.cidade, dados.estado].filter(Boolean).join(' — ')}
          />
          <DadoResumo rotulo="Público mínimo" valor={dados.publicoMinimo} />
          <DadoResumo rotulo="Público esperado" valor={dados.publicoEsperado} />
          <DadoResumo rotulo="Público máximo" valor={dados.publicoMaximo} />
        </BlocoResumo>

        <BlocoResumo titulo="Financeiro">
          <DadoResumo rotulo="Margem de lucro" valor={dados.margemLucro} />
          <DadoResumo rotulo="Custos próprios" valor={custosProprios} />
          <DadoResumo
            rotulo="Cenário de referência"
            valor={nomeDoCenario(dados.cenarioReferencia)}
          />
        </BlocoResumo>
      </div>

      <div className="preveia-ticket">
        <div>
          <p className="preveia-ticket__titulo">Prévia do ticket no público esperado</p>
          <p className="preveia-ticket__apoio">{APOIO_PREVIA}</p>
        </div>
        <strong>—</strong>
      </div>

      <p className="aviso">
        Ao publicar, o evento e seus itens de custo ficam visíveis para os fornecedores aprovados
        nas categorias escolhidas.
      </p>
    </>
  )
}

const APOIO_PREVIA =
  'Ainda sem propostas de fornecedores. O valor é recalculado a cada proposta selecionada.'

function BlocoResumo({ titulo, children }) {
  return (
    <div className="resumo__bloco">
      <h2 className="secao__titulo">{titulo}</h2>
      {children}
    </div>
  )
}

function DadoResumo({ rotulo, valor }) {
  return (
    <div className="resumo__dado">
      <span>{rotulo}</span>
      <strong>{valor || '—'}</strong>
    </div>
  )
}
