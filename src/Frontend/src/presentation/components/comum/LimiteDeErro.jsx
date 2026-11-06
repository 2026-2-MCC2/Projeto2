import { Component } from 'react'
import { ROTA_DO_LOGIN, rotaDoInicio, usuarioAtual } from '../../../application/sessao.js'

// classe por causa do getDerivedStateFromError
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
        {/* deslogado vai para o login: se a quebra foi na landing, voltar para ela repetiria o erro */}
        <a href={usuarioAtual() ? rotaDoInicio() : ROTA_DO_LOGIN} className="botao">
          Voltar ao início
        </a>
      </main>
    )
  }
}
