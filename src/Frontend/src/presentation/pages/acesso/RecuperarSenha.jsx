import { useState } from 'react'
import { Link } from 'react-router-dom'
import { pedirRedefinicaoDeSenha } from '../../../infrastructure/senha.js'
import { AcessoLayout } from '../../components/acesso/AcessoLayout.jsx'
import { RetornoDoEnvio } from '../../components/acesso/RetornoDoEnvio.jsx'
import { useValidacao } from '../../hooks/useValidacao.js'

export function RecuperarSenha() {
  const [email, setEmail] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro] = useState('')
  const validacao = useValidacao()

  async function aoEnviar(evento) {
    evento.preventDefault()
    setErro('')
    setEnviando(true)

    try {
      await pedirRedefinicaoDeSenha(email)
      setEnviado(true)
    } catch (falha) {
      setErro(falha.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <AcessoLayout tituloDaPagina="Recuperar senha">
      {enviado ? (
        <>
          <header className="acesso__cabecalho">
            <h1>Verifique seu e-mail</h1>
            <p>Enviamos o link de recuperação para o seu e-mail. Válido por 1 hora.</p>
          </header>

          <Link to="/entrar" className="acesso__botao">
            Voltar para o login
          </Link>
        </>
      ) : (
        <>
          <header className="acesso__cabecalho">
            <h1>Recuperar senha</h1>
            <p>Informe o e-mail cadastrado para receber o link de redefinição.</p>
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

            <RetornoDoEnvio erro={erro} />

            <button type="submit" className="acesso__botao" disabled={enviando}>
              {enviando ? 'Enviando...' : 'Enviar link de recuperação'}
            </button>
          </form>

          <Link to="/entrar" className="acesso__link acesso__link--centro">
            Voltar para o login
          </Link>
        </>
      )}
    </AcessoLayout>
  )
}
