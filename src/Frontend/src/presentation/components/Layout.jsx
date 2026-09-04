import { Link, Outlet } from 'react-router-dom'

export function Layout() {
  return (
    <div className="layout">
      <header className="cabecalho">
        <Link to="/" className="marca">
          DKCA DEVS
        </Link>
        <span className="cabecalho__nota">Projeto Integrador · FECAP</span>
      </header>

      <main className="conteudo">
        <Outlet />
      </main>
    </div>
  )
}
