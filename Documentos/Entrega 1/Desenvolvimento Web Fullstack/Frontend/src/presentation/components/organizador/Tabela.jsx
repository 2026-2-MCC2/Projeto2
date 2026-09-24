export function Tabela({ colunas, linhas, rodape }) {
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
        {linhas.map((linha) => (
          <tr key={linha[0]}>
            {linha.map((celula, coluna) => (
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
