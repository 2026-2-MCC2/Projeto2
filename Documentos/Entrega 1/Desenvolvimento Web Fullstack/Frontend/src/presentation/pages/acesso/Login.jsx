import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AcessoLayout } from '../../components/acesso/AcessoLayout.jsx'

export function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')

  function aoEnviar(evento) {
    evento.preventDefault()
    // Ainda não há backend: este submit fica pronto para receber a chamada à API.
  }

  return (
    <AcessoLayout>
      <header className="acesso__cabecalho">
        <h1>Entrar na plataforma</h1>
        <p>Planejamento, cotação e precificação de eventos.</p>
      </header>

      <form className="acesso__campos" onSubmit={aoEnviar}>
        <label className="campo">
          <span>E-mail</span>
          <input
            type="email"
            placeholder="voce@email.com"
            value={email}
            onChange={(evento) => setEmail(evento.target.value)}
            required
          />
        </label>

        <label className="campo">
          <span>Senha</span>
          <input
            type="password"
            placeholder="••••••••"
            value={senha}
            onChange={(evento) => setSenha(evento.target.value)}
            required
          />
        </label>

        <Link to="/recuperar-senha" className="acesso__link">
          Esqueci minha senha
        </Link>

        <button type="submit" className="acesso__botao">
          Entrar
        </button>
      </form>

      <footer className="acesso__rodape">
        <Link to="/cadastro" className="acesso__link">
          Não tem conta? Criar cadastro
        </Link>
        <p className="acesso__nota">O acesso é liberado após aprovação do administrador.</p>
      </footer>
    </AcessoLayout>
  )
}
