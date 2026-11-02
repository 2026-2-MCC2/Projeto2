import { CATEGORIAS_DE_ATUACAO } from '../../../domain/categoriasDeAtuacao.js'

export function CampoCategoriasDeAtuacao({ selecionadas, aoMudar }) {
  function alternarCategoria(categoria) {
    aoMudar(
      selecionadas.includes(categoria)
        ? selecionadas.filter((selecionada) => selecionada !== categoria)
        : [...selecionadas, categoria],
    )
  }

  return (
    <fieldset className="campo campo-categorias">
      <legend>Categorias de atuação</legend>

      <div className="campo-categorias__opcoes">
        {CATEGORIAS_DE_ATUACAO.map((categoria) => {
          const marcada = selecionadas.includes(categoria)
          return (
            <label key={categoria} className={`filtro${marcada ? ' filtro--ativo' : ''}`}>
              <input
                type="checkbox"
                className="campo-categorias__caixa"
                checked={marcada}
                onChange={() => alternarCategoria(categoria)}
              />
              {categoria}
            </label>
          )
        })}
      </div>

      {/* campo escondido que exige pelo menos uma categoria, com a mesma validação dos outros campos */}
      <input
        className="campo-categorias__exigencia"
        aria-label="Categorias de atuação escolhidas"
        tabIndex={-1}
        value={selecionadas.join(', ')}
        onChange={() => {}}
        required
      />
    </fieldset>
  )
}
