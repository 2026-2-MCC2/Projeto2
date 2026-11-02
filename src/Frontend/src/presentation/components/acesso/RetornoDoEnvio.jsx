// role="alert" faz o leitor de tela anunciar a mensagem assim que ela aparece
export function RetornoDoEnvio({ erro }) {
  if (!erro) return null

  return (
    <p className="mensagem-erro" role="alert">
      {erro}
    </p>
  )
}
