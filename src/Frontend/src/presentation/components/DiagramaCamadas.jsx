/**
 * O diagrama clássico da clean architecture: círculos concêntricos, com o
 * domínio no centro e os detalhes técnicos por fora.
 *
 * Cada anel é clicável e seleciona a camada correspondente.
 */

// Do anel externo para o interno, que é a ordem em que o SVG precisa
// desenhar: os círculos menores ficam por cima dos maiores.
const ANEIS = [
  { id: 'presentation', raio: 150, rotulo: 'presentation', y: 30 },
  { id: 'infrastructure', raio: 116, rotulo: 'infrastructure', y: 64 },
  { id: 'application', raio: 82, rotulo: 'application', y: 98 },
  { id: 'domain', raio: 48, rotulo: 'domain', y: 165 },
]

export function DiagramaCamadas({ camadaAtiva, aoSelecionar }) {
  return (
    <figure className="diagrama">
      <svg viewBox="0 0 320 320" role="group" aria-label="Camadas da clean architecture">
        <defs>
          <marker id="ponta" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 z" fill="currentColor" />
          </marker>
        </defs>

        {ANEIS.map((anel) => (
          <circle
            key={anel.id}
            className={`anel anel--${anel.id} ${camadaAtiva === anel.id ? 'anel--ativo' : ''}`}
            cx="160"
            cy="160"
            r={anel.raio}
            onClick={() => aoSelecionar(anel.id)}
          >
            <title>{anel.rotulo}</title>
          </circle>
        ))}

        {ANEIS.map((anel) => (
          <text
            key={anel.id}
            className={`anel__rotulo ${camadaAtiva === anel.id ? 'anel__rotulo--ativo' : ''}`}
            x="160"
            y={anel.y}
            textAnchor="middle"
            onClick={() => aoSelecionar(anel.id)}
          >
            {anel.rotulo}
          </text>
        ))}

        <path className="seta" d="M296 160 L214 160" markerEnd="url(#ponta)" />
      </svg>

      <figcaption>
        As dependências apontam de fora para dentro. O centro não conhece nada do que está em volta.
      </figcaption>
    </figure>
  )
}
