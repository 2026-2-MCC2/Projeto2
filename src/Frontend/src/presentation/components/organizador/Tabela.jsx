export function Tabela({ colunas, linhas, rodape, aoClicarNaLinha, linhaAtiva }) {
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
        {linhas.map((linha, indice) => (
          <tr
            key={linha.chave ?? indice}
            className={
              linha.chave && linha.chave === linhaAtiva ? 'tabela__linha--ativa' : undefined
            }
            onClick={aoClicarNaLinha ? () => aoClicarNaLinha(linha.chave) : undefined}
          >
            {(linha.celulas ?? linha).map((celula, coluna) => (
              <td key={colunas[coluna]} className={coluna === 0 ? 'tabela__destaque' : undefined}>
                {celula}
              </td>
            ))}
          </tr>
        ))}
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
