const LARGURA = 660
const ALTURA = 280
const MARGEM = { esquerda: 70, direita: 20, topo: 30, base: 34 }

// Os valores são múltiplos do custo.
export function GraficoEquilibrio({ equilibrio }) {
  const areaLargura = LARGURA - MARGEM.esquerda - MARGEM.direita
  const areaAltura = ALTURA - MARGEM.topo - MARGEM.base

  const maximo = equilibrio.publicoMaximo
  const receitaNoMaximo = maximo / equilibrio.ingressosNoEquilibrio
  const topoDaEscala = receitaNoMaximo * 1.1

  const eixoX = (ingressos) => MARGEM.esquerda + (ingressos / maximo) * areaLargura
  const eixoY = (proporcao) => MARGEM.topo + areaAltura - (proporcao / topoDaEscala) * areaAltura

  const base = MARGEM.topo + areaAltura
  const xEquilibrio = eixoX(equilibrio.ingressosNoEquilibrio)
  const yCusto = eixoY(1)
  const xFim = eixoX(maximo)
  const yFim = eixoY(receitaNoMaximo)

  return (
    <svg
      className="grafico"
      viewBox={`0 0 ${LARGURA} ${ALTURA}`}
      role="img"
      aria-label="Ponto de equilíbrio do evento"
    >
      <path
        d={`M ${xEquilibrio} ${yCusto} L ${xFim} ${yFim} L ${xFim} ${yCusto} Z`}
        style={{ fill: 'var(--status-sucesso-fundo)' }}
      />

      <line
        x1={MARGEM.esquerda}
        y1={MARGEM.topo}
        x2={MARGEM.esquerda}
        y2={base}
        style={{ stroke: 'var(--borda-padrao)' }}
      />
      <line
        x1={MARGEM.esquerda}
        y1={base}
        x2={xFim}
        y2={base}
        style={{ stroke: 'var(--borda-padrao)' }}
      />
      <line
        x1={MARGEM.esquerda}
        y1={eixoY(0.5)}
        x2={xFim}
        y2={eixoY(0.5)}
        style={{ stroke: 'var(--fundo-sutil)' }}
      />

      <line
        x1={MARGEM.esquerda}
        y1={yCusto}
        x2={xFim}
        y2={yCusto}
        style={{ stroke: 'var(--texto-terciario)' }}
        strokeWidth="2"
        strokeDasharray="8 6"
      />
      <text x={MARGEM.esquerda + 4} y={yCusto + 18} className="grafico__rotulo">
        {equilibrio.custoTotal}
      </text>

      <line
        x1={MARGEM.esquerda}
        y1={base}
        x2={xFim}
        y2={yFim}
        style={{ stroke: 'var(--texto-marca)' }}
        strokeWidth="2.5"
      />

      <line
        x1={xEquilibrio}
        y1={yCusto}
        x2={xEquilibrio}
        y2={base}
        style={{ stroke: 'var(--texto-marca)', opacity: 0.45 }}
        strokeDasharray="3 4"
      />
      <circle
        cx={xEquilibrio}
        cy={yCusto}
        r="7"
        style={{ fill: 'var(--fundo-superficie)', stroke: 'var(--texto-marca)' }}
        strokeWidth="2.5"
      />

      <text x={MARGEM.esquerda} y={ALTURA - 8} className="grafico__rotulo" textAnchor="middle">
        0
      </text>
      <text x={eixoX(maximo / 3)} y={ALTURA - 8} className="grafico__rotulo" textAnchor="middle">
        5.000
      </text>
      <text
        x={xEquilibrio}
        y={ALTURA - 8}
        className="grafico__rotulo grafico__rotulo--destaque"
        textAnchor="middle"
      >
        9.600
      </text>
      <text x={xFim} y={ALTURA - 8} className="grafico__rotulo" textAnchor="end">
        15.000
      </text>
    </svg>
  )
}
