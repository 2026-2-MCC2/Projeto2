import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  acompanhamentoDoCadastro,
  entrar,
  rotaInicialDoPerfil,
} from '../../../application/sessao.js'
import { AcessoLayout } from '../../components/acesso/AcessoLayout.jsx'
import { RetornoDoEnvio } from '../../components/acesso/RetornoDoEnvio.jsx'
import { useValidacao } from '../../hooks/useValidacao.js'
import { EntradaDeSenha } from '../../components/comum/EntradaDeSenha.jsx'

export function Login() {
  const navegar = useNavigate()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const validacao = useValidacao()

  async function aoEnviar(evento) {
    evento.preventDefault()
    setErro('')
    setEnviando(true)

    try {
      const usuario = await entrar({ email, senha })
      navegar(rotaInicialDoPerfil(usuario.perfil), { replace: true })
    } catch (falha) {
      const acompanhamento = acompanhamentoDoCadastro(falha)
      if (acompanhamento) {
        navegar('/cadastro-pendente', { state: acompanhamento })
        return
      }
      setErro(falha.message)
      setEnviando(false)
    }
  }

  return (
    <AcessoLayout tituloDaPagina="Entrar">
      <header className="acesso__cabecalho">
        <h1>Entrar na plataforma</h1>
        <p>Planejamento, cotação e precificação de eventos.</p>
      </header>

      <form className="acesso__campos" onSubmit={aoEnviar} {...validacao}>
        <label className="campo">
          <span>E-mail</span>
          <input
            type="email"
            autoComplete="email"
            data-validar="email"
            placeholder="voce@email.com"
            value={email}
            onChange={(evento) => setEmail(evento.target.value)}
            required
          />
        </label>

        <label className="campo">
          <span>Senha</span>
          <EntradaDeSenha
            autoComplete="current-password"
            placeholder="••••••••"
            value={senha}
            onChange={(evento) => setSenha(evento.target.value)}
            required
          />
        </label>

        <Link to="/recuperar-senha" className="acesso__link">
          Esqueceu sua senha?
        </Link>

        <RetornoDoEnvio erro={erro} />

        <button type="submit" className="acesso__botao" disabled={enviando}>
          {enviando ? 'Entrando...' : 'Entrar'}
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
