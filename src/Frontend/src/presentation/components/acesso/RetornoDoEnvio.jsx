// Aviso e erro do envio do cadastro, mostrados acima do botão de enviar.
// role="status" e role="alert" fazem o leitor de tela anunciar a mensagem assim que ela aparece.
export function RetornoDoEnvio({ erro, aviso }) {
  return (
    <>
      {aviso && (
        <p className="acesso__aviso" role="status">
          {aviso}
        </p>
      )}
      {erro && (
        <p className="mensagem-erro" role="alert">
          {erro}
        </p>
      )}
    </>
  )
}
