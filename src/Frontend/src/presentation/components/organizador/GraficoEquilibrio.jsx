import { useIsMobile } from '../../hooks/useIsMobile.js'

// no celular o desenho usa a largura da tela: reduzido de 660, o texto ficava ilegível
const TAMANHOS = {
  desktop: { LARGURA: 660, ALTURA: 280, MARGEM: { esquerda: 70, direita: 20, topo: 30, base: 34 } },
  celular: { LARGURA: 320, ALTURA: 220, MARGEM: { esquerda: 6, direita: 6, topo: 16, base: 30 } },
}
// rótulos do eixo mais perto que isso se sobrepõem: fica só o do ponto de equilíbrio
const DISTANCIA_MINIMA_ENTRE_ROTULOS = 46

export function GraficoEquilibrio({ equilibrio }) {
  const isMobile = useIsMobile()
  const { LARGURA, ALTURA, MARGEM } = TAMANHOS[isMobile ? 'celular' : 'desktop']
  const areaLargura = LARGURA - MARGEM.esquerda - MARGEM.direita
  const areaAltura = ALTURA - MARGEM.topo - MARGEM.base

  const maximo = Math.max(Number(equilibrio?.publicoMaximo) || 1, 1)
  const ingressosEq = Math.max(Number(equilibrio?.ingressosNoEquilibrio) || 1, 1)
  const receitaNoMaximo = Math.max(maximo / ingressosEq, 0.1)
  const topoDaEscala = Math.max(receitaNoMaximo * 1.1, 1.2)

  const eixoX = (ingressos) =>
    MARGEM.esquerda + (Math.min(Math.max(ingressos, 0), maximo) / maximo) * areaLargura
  const eixoY = (proporcao) =>
    MARGEM.topo +
    areaAltura -
    (Math.min(Math.max(proporcao, 0), topoDaEscala) / topoDaEscala) * areaAltura

  const base = MARGEM.topo + areaAltura
  const xEquilibrio = eixoX(ingressosEq)
  const yCusto = eixoY(1)
  const xFim = eixoX(maximo)
  const yFim = eixoY(receitaNoMaximo)

  const terco = Math.max(Math.round(maximo / 3), 1)
  const longeDoEquilibrio = (x) => Math.abs(x - xEquilibrio) >= DISTANCIA_MINIMA_ENTRE_ROTULOS

  return (
    <svg
      className={`grafico${isMobile ? ' grafico--celular' : ''}`}
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

      <text
        x={MARGEM.esquerda}
        y={ALTURA - 8}
        className="grafico__rotulo"
        textAnchor={isMobile ? 'start' : 'middle'}
      >
        0
      </text>
      {longeDoEquilibrio(eixoX(terco)) && (
        <text x={eixoX(terco)} y={ALTURA - 8} className="grafico__rotulo" textAnchor="middle">
          {terco.toLocaleString('pt-BR')}
        </text>
      )}
      <text
        x={xEquilibrio}
        y={ALTURA - 8}
        className="grafico__rotulo grafico__rotulo--destaque"
        textAnchor="middle"
      >
        {ingressosEq.toLocaleString('pt-BR')}
      </text>
      {longeDoEquilibrio(xFim) && (
        <text x={xFim} y={ALTURA - 8} className="grafico__rotulo" textAnchor="end">
          {maximo.toLocaleString('pt-BR')}
        </text>
      )}
    </svg>
  )
}
