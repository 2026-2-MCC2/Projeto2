import { Component } from 'react'

// Evita a página em branco quando um componente quebra. Precisa ser classe por causa do
// getDerivedStateFromError.
export class LimiteDeErro extends Component {
  state = { quebrou: false }

  static getDerivedStateFromError() {
    return { quebrou: true }
  }

  componentDidCatch(erro, info) {
    console.error('Erro na interface:', erro, info.componentStack)
  }

  render() {
    if (!this.state.quebrou) return this.props.children

    return (
      <main className="estado-tela estado-tela--pagina" role="alert">
        <title>Algo deu errado · TrocaTicket</title>
        <strong>Algo deu errado nesta página.</strong>
        <p>Recarregue a página. Se o problema continuar, volte ao início.</p>
        <a href="/" className="botao">
          Voltar ao início
        </a>
      </main>
    )
  }
}
