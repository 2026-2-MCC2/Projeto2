import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { validarConfirmacaoSenha } from '../../../domain/validacao.js'
import { redefinirSenha } from '../../../infrastructure/senha.js'
import { AcessoLayout } from '../../components/acesso/AcessoLayout.jsx'
import { RetornoDoEnvio } from '../../components/acesso/RetornoDoEnvio.jsx'
import { useValidacao } from '../../hooks/useValidacao.js'
import { toast } from '../../toasts.js'

export function RedefinirSenha() {
  const navegar = useNavigate()
  const [parametros] = useSearchParams()
  const token = parametros.get('token')
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const validacao = useValidacao({
    confirmacaoSenha: (valor, valores) => validarConfirmacaoSenha(valor, valores.senha),
  })

  async function aoEnviar(evento) {
    evento.preventDefault()
    setErro('')
    setEnviando(true)

    try {
      await redefinirSenha({ token, senha })
      toast.sucesso('Senha alterada', { descricao: 'Entre com a senha nova.' })
      navegar('/', { replace: true })
    } catch (falha) {
      setErro(falha.message)
      setEnviando(false)
    }
  }

  if (!token) {
    return (
      <AcessoLayout tituloDaPagina="Redefinir senha">
        <header className="acesso__cabecalho">
          <h1>Link incompleto</h1>
          <p>Abra o link exatamente como chegou no e-mail ou peça um novo.</p>
        </header>

        <Link to="/recuperar-senha" className="acesso__botao">
          Pedir novo link
        </Link>
      </AcessoLayout>
    )
  }

  return (
    <AcessoLayout tituloDaPagina="Redefinir senha">
      <header className="acesso__cabecalho">
        <h1>Criar senha nova</h1>
        <p>Depois de salvar, os acessos abertos com a senha antiga são encerrados.</p>
      </header>

      <form className="acesso__campos" onSubmit={aoEnviar} {...validacao}>
        <label className="campo">
          <span>Senha nova</span>
          <input
            type="password"
            name="senha"
            autoComplete="new-password"
            data-validar="senha"
            placeholder="Mínimo de 8 caracteres"
            maxLength={72}
            value={senha}
            onChange={(evento) => setSenha(evento.target.value)}
            required
          />
        </label>

        <label className="campo">
          <span>Confirme a senha nova</span>
          <input
            type="password"
            name="confirmacaoSenha"
            autoComplete="new-password"
            placeholder="Repita a senha"
            maxLength={72}
            value={confirmacao}
            onChange={(evento) => setConfirmacao(evento.target.value)}
            required
          />
        </label>

        <RetornoDoEnvio erro={erro} />

        <button type="submit" className="acesso__botao" disabled={enviando}>
          {enviando ? 'Salvando...' : 'Salvar senha nova'}
        </button>
      </form>

      <Link to="/recuperar-senha" className="acesso__link acesso__link--centro">
        Pedir novo link
      </Link>
    </AcessoLayout>
  )
}
