// Com aoClicarNaLinha, a linha inteira abre no clique e a primeira célula vira um botão, para a
// linha também abrir pelo teclado (Tab, Enter ou Espaço); o clique do botão sobe até a linha.
// Linha com bloqueada: true não abre. acaoDaLinha (ex.: "Editar") entra antes do texto do botão, só
// para o leitor de tela, que assim ouve "Editar Som e luz, botão" e não só "Som e luz, botão".
export function Tabela({ colunas, linhas, rodape, aoClicarNaLinha, acaoDaLinha = 'Abrir' }) {
  return (
    <table className="tabela">
      <thead>
        <tr>
          {colunas.map((coluna) => (
            <th key={coluna}>{coluna}</th>
          ))}
        </tr>
      </thead>

      <tbody>
        {linhas.map((linha, indice) => {
          const abre = Boolean(aoClicarNaLinha) && !linha.bloqueada
          return (
            <tr
              key={linha.chave ?? indice}
              className={abre ? 'tabela__linha--abre' : undefined}
              onClick={abre ? () => aoClicarNaLinha(linha.chave) : undefined}
            >
              {(linha.celulas ?? linha).map((celula, coluna) => (
                <td key={colunas[coluna]} className={coluna === 0 ? 'tabela__destaque' : undefined}>
                  {coluna === 0 && abre ? (
                    <button type="button" className="tabela__abrir">
                      <span className="so-leitor">{acaoDaLinha} </span>
                      {celula}
                    </button>
                  ) : (
                    celula
                  )}
                </td>
              ))}
            </tr>
          )
        })}
      </tbody>

      {rodape && (
        <tfoot>
          <tr>
            {rodape.map((celula, coluna) => (
              <td key={colunas[coluna]}>{celula}</td>
            ))}
          </tr>
        </tfoot>
      )}
    </table>
  )
}
