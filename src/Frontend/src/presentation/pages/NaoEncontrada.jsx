import { Link } from 'react-router-dom'

export function NaoEncontrada() {
  return (
    <section className="bloco">
      <h2>404</h2>
      <p>Essa página não existe.</p>
      <Link to="/">Voltar para o início</Link>
    </section>
  )
}
