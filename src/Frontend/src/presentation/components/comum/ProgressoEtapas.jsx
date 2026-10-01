export function ProgressoEtapas({ etapas, etapaAtual }) {
  return (
    <div className="progresso">
      <div className="progresso__legenda">
        <strong>Etapa {etapaAtual} de {etapas.length}</strong>
        <span>{etapas[etapaAtual - 1]}</span>
      </div>

      <div className="progresso__trilho" aria-label={`Etapa ${etapaAtual} de ${etapas.length}`}>
        {etapas.map((etapa, indice) => {
          const numero = indice + 1
          const estado = numero < etapaAtual
            ? ' progresso__passo--feito'
            : numero === etapaAtual
              ? ' progresso__passo--atual'
              : ''
          return <span key={etapa} className={`progresso__passo${estado}`} />
        })}
      </div>
    </div>
  )
}
