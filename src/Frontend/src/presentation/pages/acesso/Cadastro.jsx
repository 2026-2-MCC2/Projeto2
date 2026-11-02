import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AcessoLayout } from '../../components/acesso/AcessoLayout.jsx'
import { CadastroMobile } from '../../components/acesso/CadastroMobile.jsx'
import { CampoAreaDeAtuacao } from '../../components/acesso/CampoAreaDeAtuacao.jsx'
import { RetornoDoEnvio } from '../../components/acesso/RetornoDoEnvio.jsx'
import { useEnvioCadastro } from '../../hooks/useEnvioCadastro.js'
import { useIsMobile } from '../../hooks/useIsMobile.js'
import { useValidacao } from '../../hooks/useValidacao.js'
import fotoMusica from '../../assets/acesso/foto-musica.jpg'

const PERFIS = [
  { id: 'organizador', nome: 'Organizador', resumo: 'Cria eventos e compara propostas.' },
  { id: 'fornecedor', nome: 'Fornecedor', resumo: 'Consulta eventos e envia propostas.' },
]

const DADOS_INICIAIS = {
  nome: '',
  areaDeAtuacao: '',
  cnpj: '',
  telefone: '',
  email: '',
  senha: '',
}

export function Cadastro() {
  const isMobile = useIsMobile()
  const [perfil, setPerfil] = useState('organizador')
  const [dados, setDados] = useState(DADOS_INICIAIS)
  const validacao = useValidacao()
  const { enviar, enviando, erro } = useEnvioCadastro()

  function preencher(campo) {
    return (evento) => setDados({ ...dados, [campo]: evento.target.value })
  }

  // a área de atuação é só do fornecedor: ao trocar de perfil, ela recomeça vazia
  function escolherPerfil(novoPerfil) {
    setPerfil(novoPerfil)
    setDados({ ...dados, areaDeAtuacao: '' })
  }

  function aoEnviar(evento) {
    evento.preventDefault()
    enviar({ ...dados, perfil })
  }

  // No mobile o cadastro é dividido em três etapas, como no protótipo.
  if (isMobile) {
    return <CadastroMobile />
  }

  return (
    <AcessoLayout
      tituloDaPagina="Criar cadastro"
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
            aria-pressed={perfil === opcao.id}
            className={`acesso__perfil${perfil === opcao.id ? ' acesso__perfil--ativo' : ''}`}
            onClick={() => escolherPerfil(opcao.id)}
          >
            <strong>{opcao.nome}</strong>
            <span>{opcao.resumo}</span>
          </button>
        ))}
      </div>

      <form className="acesso__campos" onSubmit={aoEnviar} {...validacao}>
        <label className="campo">
          <span>Nome ou razão social</span>
          <input
            type="text"
            autoComplete="organization"
            placeholder="TrocaTicket Produções Ltda."
            value={dados.nome}
            onChange={preencher('nome')}
            required
          />
        </label>

        {perfil === 'fornecedor' && (
          <CampoAreaDeAtuacao valor={dados.areaDeAtuacao} aoMudar={preencher('areaDeAtuacao')} />
        )}

        <div className="acesso__linha">
          <label className="campo">
            <span>CNPJ</span>
            <input
              type="text"
              data-validar="cnpj"
              placeholder="00.000.000/0001-00"
              value={dados.cnpj}
              onChange={preencher('cnpj')}
              required
            />
          </label>

          <label className="campo">
            <span>Telefone</span>
            <input
              type="tel"
              autoComplete="tel"
              data-validar="telefone"
              placeholder="(11) 90000-0000"
              value={dados.telefone}
              onChange={preencher('telefone')}
              required
            />
          </label>
        </div>

        <label className="campo">
          <span>E-mail</span>
          <input
            type="email"
            autoComplete="email"
            data-validar="email"
            placeholder="voce@email.com"
            value={dados.email}
            onChange={preencher('email')}
            required
          />
        </label>

        <label className="campo">
          <span>Senha</span>
          <input
            type="password"
            autoComplete="new-password"
            data-validar="senha"
            placeholder="Mínimo de 8 caracteres"
            value={dados.senha}
            onChange={preencher('senha')}
            required
          />
        </label>

        <p className="acesso__aviso">O cadastro fica pendente até a aprovação do administrador.</p>

        <RetornoDoEnvio erro={erro} />

        <button type="submit" className="acesso__botao" disabled={enviando}>
          {enviando ? 'Enviando...' : 'Enviar cadastro'}
        </button>
      </form>

      <Link to="/" className="acesso__link acesso__link--centro">
        Já tem conta? Entrar
      </Link>
    </AcessoLayout>
  )
}
