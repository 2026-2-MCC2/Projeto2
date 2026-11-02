// role="alert" faz o leitor de tela anunciar a mensagem assim que ela aparece
export function RetornoDoEnvio({ erro }) {
  if (!erro) return null

  return (
    <div className="alerta-erro" role="alert">
      <span className="alerta-erro__icone" aria-hidden="true" />
      <p>{erro}</p>
    </div>
  )
}
