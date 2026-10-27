import { Icone } from './Icone.jsx'
import iconeConcluido from '../../assets/organizador/icone-concluido.svg'
import iconeConcluidoVerde from '../../assets/organizador/icone-concluido-verde.svg'

const situacaoDa = (numero, etapaAtual) =>
  numero < etapaAtual ? 'concluida' : numero === etapaAtual ? 'atual' : 'futura'

export function ProgressoEtapas({ etapas, etapaAtual }) {
  return (
    <div className="progresso">
      <div className="progresso__legenda">
        <strong>
          Etapa {etapaAtual} de {etapas.length}
        </strong>
        <span>{etapas[etapaAtual - 1]}</span>
      </div>

      <div className="progresso__trilho" aria-hidden="true">
        {etapas.map((etapa, indice) => (
          <span
            key={etapa}
            className={`progresso__passo progresso__passo--${situacaoDa(indice + 1, etapaAtual)}`}
          />
        ))}
      </div>
    </div>
  )
}

// tom="sucesso" pinta as etapas concluídas de verde (fluxo do fornecedor)
export function PassosDasEtapas({ etapas, etapaAtual, tom = 'marca' }) {
  return (
    <ol className={`passos passos--${tom}`} aria-label="Etapas">
      {etapas.map((etapa, indice) => {
        const numero = indice + 1
        const situacao = situacaoDa(numero, etapaAtual)

        return (
          <li
            key={etapa}
            className={`passos__item passos__item--${situacao}`}
            aria-current={situacao === 'atual' ? 'step' : undefined}
          >
            <span className="passos__marcador">
              {situacao === 'concluida' ? (
                <Icone src={tom === 'sucesso' ? iconeConcluidoVerde : iconeConcluido} />
              ) : (
                numero
              )}
            </span>

            <span className="passos__rotulo">
              <span>Etapa {numero}</span>
              <strong>{etapa}</strong>
            </span>

            {numero < etapas.length && <span className="passos__conector" aria-hidden="true" />}
          </li>
        )
      })}
    </ol>
  )
}
