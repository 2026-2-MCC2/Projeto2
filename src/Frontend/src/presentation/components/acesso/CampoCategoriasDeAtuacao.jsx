import { CATEGORIAS_DE_ATUACAO } from '../../../domain/categoriasDeAtuacao.js'

export function CampoCategoriasDeAtuacao({ selecionadas, aoMudar }) {
  function alternarCategoria(categoria) {
    aoMudar(
      selecionadas.includes(categoria)
        ? selecionadas.filter((selecionada) => selecionada !== categoria)
        : [...selecionadas, categoria],
    )
  }

  const resumo =
    selecionadas.length === 0
      ? 'Escolha uma ou mais'
      : `${selecionadas.length} ${selecionadas.length === 1 ? 'escolhida' : 'escolhidas'}`

  return (
    <fieldset className="campo campo-categorias">
      <legend className="campo-categorias__titulo">
        Categorias de atuação
        <span className="campo-categorias__resumo">{resumo}</span>
      </legend>

      <div className="campo-categorias__opcoes">
        {CATEGORIAS_DE_ATUACAO.map((categoria) => {
          const marcada = selecionadas.includes(categoria)
          return (
            <label
              key={categoria}
              className={`campo-categorias__opcao${marcada ? ' campo-categorias__opcao--marcada' : ''}`}
            >
              <input
                type="checkbox"
                className="campo-categorias__caixa"
                checked={marcada}
                onChange={() => alternarCategoria(categoria)}
              />
              <span className="campo-categorias__marcador" aria-hidden="true" />
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
