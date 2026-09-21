import { Link } from 'react-router-dom'

export function NaoEncontrada() {
  return (
    <section className="conteudo bloco">
      <h2>404</h2>
      <p>Essa página não existe.</p>
      <Link to="/">Voltar para o login</Link>
    </section>
  )
}
