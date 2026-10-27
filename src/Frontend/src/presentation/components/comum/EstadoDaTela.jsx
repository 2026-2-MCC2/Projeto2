// O erro mostra o campo translation do padrão de erro da API.

export function Carregando({ mensagem = 'Carregando…' }) {
  return (
    <div className="estado-tela" role="status" aria-live="polite">
      <span className="estado-tela__indicador" aria-hidden="true" />
      <p>{mensagem}</p>
    </div>
  )
}

export function ErroNaTela({ erro, aoTentarDeNovo }) {
  return (
    <div className="estado-tela estado-tela--erro" role="alert">
      <strong>Não foi possível carregar.</strong>
      <p>{erro?.translation ?? 'Tente novamente em alguns instantes.'}</p>
      {aoTentarDeNovo && (
        <button type="button" className="botao botao--secundario" onClick={aoTentarDeNovo}>
          Tentar de novo
        </button>
      )}
    </div>
  )
}

export function Vazio({ titulo, mensagem, children }) {
  return (
    <div className="estado-tela" role="status">
      <strong>{titulo}</strong>
      {mensagem && <p>{mensagem}</p>}
      {children}
    </div>
  )
}
