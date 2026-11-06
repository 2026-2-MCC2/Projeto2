import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import {
  acompanhamentoDoCadastro,
  cadastroEmAnalise,
  credencialInvalida,
  entrar,
  rotaInicialDoPerfil,
  ROTA_DO_LOGIN,
  usuarioAtual,
} from '../../../application/sessao.js'
import { AcessoLayout } from '../../components/acesso/AcessoLayout.jsx'
import { RetornoDoEnvio } from '../../components/acesso/RetornoDoEnvio.jsx'
import { useValidacao } from '../../hooks/useValidacao.js'
import { EntradaDeSenha } from '../../components/comum/EntradaDeSenha.jsx'
import { Icone } from '../../components/comum/Icone.jsx'
import { semMovimento, tremer } from '../../movimento.js'
import iconeRelogio from '../../assets/acesso/icone-relogio.svg'

// tempo para ver o ✓ antes de sair da tela
const ESPERA_DO_SUCESSO = 450

const SEM_CONEXAO = 'Não foi possível conectar. Tente novamente.'
const EM_ANALISE =
  'Seu cadastro está em análise. O acesso é liberado após a aprovação do administrador.'

export function Login() {
  const navegar = useNavigate()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  // parado, enviando ou sucesso: decide o que o botão mostra
  const [estado, setEstado] = useState('parado')
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const campoDaSenha = useRef(null)
  const validacao = useValidacao()

  useEffect(() => {
    if (estado !== 'sucesso') return
    const destino = rotaInicialDoPerfil(usuarioAtual()?.perfil)
    const espera = setTimeout(
      () => navegar(destino, { replace: true }),
      semMovimento() ? 0 : ESPERA_DO_SUCESSO,
    )
    return () => clearTimeout(espera)
  }, [estado, navegar])

  // perfil desconhecido cai no próprio login: sem a comparação, a tela redirecionaria para ela mesma sem parar.
  // No sucesso a sessão já existe, mas quem redireciona é o efeito acima, depois de mostrar o ✓
  const areaDoUsuarioLogado = rotaInicialDoPerfil(usuarioAtual()?.perfil)
  if (estado !== 'sucesso' && areaDoUsuarioLogado !== ROTA_DO_LOGIN) {
    return <Navigate to={areaDoUsuarioLogado} replace />
  }

  async function aoEnviar(evento) {
    evento.preventDefault()
    if (estado !== 'parado') return
    setErro('')
    setAviso('')
    setEstado('enviando')

    try {
      await entrar({ email, senha })
      setEstado('sucesso')
    } catch (falha) {
      const acompanhamento = acompanhamentoDoCadastro(falha)
      if (acompanhamento) {
        navegar('/cadastro-pendente', { state: acompanhamento })
        return
      }

      setEstado('parado')
      if (cadastroEmAnalise(falha)) {
        setAviso(EM_ANALISE)
        return
      }

      // status null: a requisição nem chegou ao backend
      setErro(falha.status === null ? SEM_CONEXAO : falha.message)
      if (credencialInvalida(falha)) {
        const campo = campoDaSenha.current
        tremer(campo.form)
        campo.focus()
        campo.select()
      }
    }
  }

  return (
    <AcessoLayout tituloDaPagina="Entrar" entrada>
      {/* --i é a posição na fila da entrada; o logo, no AcessoLayout, é o 0 */}
      <header className="acesso__cabecalho">
        <h1 className="acesso__entra" style={{ '--i': 1 }}>
          Entrar na plataforma
        </h1>
        <p className="acesso__entra" style={{ '--i': 2 }}>
          Planejamento, cotação e precificação de eventos.
        </p>
      </header>

      <form className="acesso__campos" onSubmit={aoEnviar} {...validacao}>
        <label className="campo acesso__entra" style={{ '--i': 3 }}>
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

        <label className="campo acesso__entra" style={{ '--i': 4 }}>
          <span>Senha</span>
          <EntradaDeSenha
            ref={campoDaSenha}
            autoComplete="current-password"
            placeholder="••••••••"
            value={senha}
            onChange={(evento) => setSenha(evento.target.value)}
            required
          />
        </label>

        <Link to="/recuperar-senha" className="acesso__link acesso__entra" style={{ '--i': 5 }}>
          Esqueceu sua senha?
        </Link>

        <RetornoDoEnvio erro={erro} />

        {aviso && (
          <div className="acesso__aviso" role="alert">
            <Icone src={iconeRelogio} />
            <p>{aviso}</p>
          </div>
        )}

        {/* o texto fica no botão, só transparente, para o leitor de tela continuar lendo "Entrar" */}
        <button
          type="submit"
          className={`acesso__botao acesso__botao--${estado} acesso__entra`}
          style={{ '--i': 6 }}
          aria-busy={estado === 'enviando'}
          disabled={estado !== 'parado'}
        >
          <span className="acesso__botao-texto">Entrar</span>
          {estado === 'enviando' && <span className="acesso__giro" aria-hidden="true" />}
          {estado === 'sucesso' && (
            <span className="acesso__confirmado" aria-hidden="true">
              ✓
            </span>
          )}
        </button>
      </form>

      <footer className="acesso__rodape acesso__entra" style={{ '--i': 7 }}>
        <Link to="/cadastro" className="acesso__link">
          Não tem conta? Criar cadastro
        </Link>
        <p className="acesso__nota">O acesso é liberado após aprovação do administrador.</p>
      </footer>
    </AcessoLayout>
  )
}
