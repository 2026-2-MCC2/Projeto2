import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AcessoLayout } from '../../components/acesso/AcessoLayout.jsx'
import fotoShow from '../../assets/acesso/foto-show.jpg'

export function RecuperarSenha() {
  const [enviado, setEnviado] = useState(false)

  function aoEnviar(evento) {
    evento.preventDefault()
    // Ainda não há backend: por enquanto o envio apenas simula o link de recuperação.
    setEnviado(true)
  }

  return (
    <AcessoLayout
      foto={fotoShow}
      titulo={
        <>
          Do orçamento ao
          <br />
          preço do ingresso.
        </>
      }
      descricao="Cadastre custos, receba propostas de fornecedores e calcule o ticket médio antes de abrir as vendas."
    >
      {enviado ? (
        <>
          <header className="acesso__cabecalho">
            <h1>Verifique seu e-mail</h1>
            <p>
              Enviamos um link de redefinição para o e-mail cadastrado. Se não encontrar, confira a
              caixa de spam.
            </p>
          </header>

          <Link to="/" className="acesso__botao">
            Voltar para o login
          </Link>
        </>
      ) : (
        <>
          <header className="acesso__cabecalho">
            <h1>Recuperar senha</h1>
            <p>Informe o e-mail cadastrado para receber o link de redefinição.</p>
          </header>

          <form className="acesso__campos" onSubmit={aoEnviar}>
            <label className="campo">
              <span>E-mail</span>
              <input type="email" placeholder="voce@email.com" required />
            </label>

            <button type="submit" className="acesso__botao">
              Enviar link de recuperação
            </button>
          </form>

          <Link to="/" className="acesso__link acesso__link--centro">
            Voltar para o login
          </Link>
        </>
      )}
    </AcessoLayout>
  )
}
