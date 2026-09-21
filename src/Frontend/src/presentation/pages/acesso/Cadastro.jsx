import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AcessoLayout } from '../../components/acesso/AcessoLayout.jsx'
import { CadastroMobile } from '../../components/acesso/CadastroMobile.jsx'
import { useIsMobile } from '../../hooks/useIsMobile.js'
import fotoMusica from '../../assets/acesso/foto-musica.jpg'

const PERFIS = [
  { id: 'organizador', nome: 'Organizador', resumo: 'Cria eventos e compara propostas.' },
  { id: 'fornecedor', nome: 'Fornecedor', resumo: 'Consulta eventos e envia propostas.' },
]

export function Cadastro() {
  const navegar = useNavigate()
  const isMobile = useIsMobile()
  const [perfil, setPerfil] = useState('organizador')

  function aoEnviar(evento) {
    evento.preventDefault()
    // Ainda não há backend: por enquanto o envio apenas simula o fluxo de aprovação.
    navegar('/cadastro-pendente')
  }

  // No mobile o cadastro é dividido em três etapas, como no protótipo.
  if (isMobile) {
    return <CadastroMobile />
  }

  return (
    <AcessoLayout
      foto={fotoMusica}
      tom="azul"
      titulo={
        <>
          Cada show começa
          <br />
          com uma planilha.
        </>
      }
      descricao="Cadastre-se para planejar custos, receber propostas de fornecedores e descobrir o preço justo do ingresso."
    >
      <header className="acesso__cabecalho">
        <h1>Criar cadastro</h1>
        <p>Escolha seu perfil e informe os dados da empresa.</p>
      </header>

      <div className="acesso__perfis">
        {PERFIS.map((opcao) => (
          <button
            key={opcao.id}
            type="button"
            className={`acesso__perfil${perfil === opcao.id ? ' acesso__perfil--ativo' : ''}`}
            onClick={() => setPerfil(opcao.id)}
          >
            <strong>{opcao.nome}</strong>
            <span>{opcao.resumo}</span>
          </button>
        ))}
      </div>

      <form className="acesso__campos" onSubmit={aoEnviar}>
        <label className="campo">
          <span>Nome ou razão social</span>
          <input type="text" placeholder="TrocaTicket Produções Ltda." required />
        </label>

        <div className="acesso__linha">
          <label className="campo">
            <span>CNPJ</span>
            <input type="text" placeholder="00.000.000/0001-00" required />
          </label>

          <label className="campo">
            <span>Telefone</span>
            <input type="tel" placeholder="(11) 90000-0000" required />
          </label>
        </div>

        <label className="campo">
          <span>E-mail</span>
          <input type="email" placeholder="voce@email.com" required />
        </label>

        <label className="campo">
          <span>Senha</span>
          <input type="password" placeholder="Mínimo de 8 caracteres" minLength={8} required />
        </label>

        <p className="acesso__aviso">O cadastro fica pendente até a aprovação do administrador.</p>

        <button type="submit" className="acesso__botao">
          Enviar cadastro
        </button>
      </form>

      <Link to="/" className="acesso__link acesso__link--centro">
        Já tem conta? Entrar
      </Link>
    </AcessoLayout>
  )
}
