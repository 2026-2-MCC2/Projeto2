import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AcessoLayout } from '../../components/acesso/AcessoLayout.jsx'
import { CadastroMobile } from '../../components/acesso/CadastroMobile.jsx'
import { CampoCategoriasDeAtuacao } from '../../components/acesso/CampoCategoriasDeAtuacao.jsx'
import { RetornoDoEnvio } from '../../components/acesso/RetornoDoEnvio.jsx'
import { Icone } from '../../components/comum/Icone.jsx'
import { ProgressoEtapas } from '../../components/comum/ProgressoEtapas.jsx'
import { useEnvioCadastro } from '../../hooks/useEnvioCadastro.js'
import { useVerificacaoDeCnpj } from '../../hooks/useVerificacaoDeCnpj.js'
import { useIsMobile } from '../../hooks/useIsMobile.js'
import { useValidacao } from '../../hooks/useValidacao.js'
import { validarConfirmacaoSenha } from '../../../domain/validacao.js'
import fotoMusica from '../../assets/acesso/foto-musica.jpg'
import perfilSelecionado from '../../assets/acesso/perfil-selecionado.svg'
import { EntradaDeSenha } from '../../components/comum/EntradaDeSenha.jsx'

const ETAPAS = ['Perfil', 'Dados da empresa', 'Acesso']
const ETAPA_DO_CNPJ = 2

const PERFIS = [
  {
    id: 'organizador',
    nome: 'Organizador',
    resumo: 'Cria eventos, cadastra itens de custo, recebe e compara propostas.',
  },
  {
    id: 'fornecedor',
    nome: 'Fornecedor',
    resumo: 'Consulta eventos abertos e envia propostas para os itens de custo.',
  },
]

const TITULOS_DAS_ETAPAS = {
  1: {
    titulo: 'Qual é o seu perfil?',
    subtitulo: 'Isso define o que você faz na plataforma.',
  },
  2: {
    titulo: 'Dados da empresa',
    subtitulo: 'Informações usadas na análise do administrador.',
  },
  3: {
    titulo: 'Dados de acesso',
    subtitulo: 'Com esses dados você entra após a aprovação.',
  },
}

const DADOS_INICIAIS = {
  nome: '',
  categorias: [],
  cnpj: '',
  telefone: '',
  email: '',
  senha: '',
  confirmacaoSenha: '',
}

export function Cadastro() {
  const isMobile = useIsMobile()
  const [etapa, setEtapa] = useState(1)
  const [perfil, setPerfil] = useState('organizador')
  const [dados, setDados] = useState(DADOS_INICIAIS)
  const validacao = useValidacao({
    confirmacaoSenha: (valor, valores) => validarConfirmacaoSenha(valor, valores.senha),
  })
  const { enviar, enviando, erro } = useEnvioCadastro()
  const { verificando, erroDoCnpj, cnpjEstaLivre, limparErroDoCnpj } = useVerificacaoDeCnpj()

  function preencher(campo) {
    return (evento) => {
      if (campo === 'cnpj') limparErroDoCnpj()
      setDados({ ...dados, [campo]: evento.target.value })
    }
  }

  // categorias são só do fornecedor: recomeçam vazias ao trocar de perfil
  function escolherPerfil(novoPerfil) {
    setPerfil(novoPerfil)
    setDados({ ...dados, categorias: [] })
  }

  function voltar() {
    if (etapa > 1) {
      setEtapa(etapa - 1)
    }
  }

  async function aoEnviar(evento) {
    evento.preventDefault()

    if (etapa === ETAPA_DO_CNPJ && !(await cnpjEstaLivre(dados.cnpj))) return

    if (etapa < ETAPAS.length) {
      setEtapa(etapa + 1)
      return
    }

    enviar({ ...dados, perfil })
  }

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
      <ProgressoEtapas etapas={ETAPAS} etapaAtual={etapa} />

      <header className="acesso__cabecalho">
        <h1>{TITULOS_DAS_ETAPAS[etapa].titulo}</h1>
        <p>{TITULOS_DAS_ETAPAS[etapa].subtitulo}</p>
      </header>

      <form className="acesso__campos" onSubmit={aoEnviar} {...validacao}>
        {etapa === 1 && (
          <>
            <div className="acesso__perfis">
              {PERFIS.map((opcao) => (
                <button
                  key={opcao.id}
                  type="button"
                  aria-pressed={perfil === opcao.id}
                  className={`etapas__perfil${perfil === opcao.id ? ' etapas__perfil--ativo' : ''}`}
                  onClick={() => escolherPerfil(opcao.id)}
                >
                  <span className="etapas__perfil-nome">
                    <strong>{opcao.nome}</strong>
                    {perfil === opcao.id && <Icone src={perfilSelecionado} />}
                  </span>
                  <span className="etapas__perfil-resumo">{opcao.resumo}</span>
                </button>
              ))}
            </div>

            <p className="etapas__nota">
              Cadastros passam por aprovação do administrador antes do primeiro acesso.
            </p>

            <button type="submit" className="acesso__botao">
              Continuar
            </button>
          </>
        )}

        {etapa === 2 && (
          <>
            <label className="campo">
              <span>Nome ou razão social</span>
              <input
                type="text"
                name="nome"
                autoComplete="organization"
                placeholder="TrocaTicket Produções Ltda."
                value={dados.nome}
                onChange={preencher('nome')}
                required
              />
            </label>

            <div className="acesso__linha">
              <label className="campo">
                <span>CNPJ</span>
                <input
                  type="text"
                  name="cnpj"
                  data-validar="cnpj"
                  autoCapitalize="characters"
                  maxLength={20}
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
                  name="telefone"
                  autoComplete="tel"
                  data-validar="telefone"
                  placeholder="(11) 90000-0000"
                  value={dados.telefone}
                  onChange={preencher('telefone')}
                  required
                />
              </label>
            </div>

            {perfil === 'fornecedor' && (
              <CampoCategoriasDeAtuacao
                selecionadas={dados.categorias}
                aoMudar={(categorias) => setDados({ ...dados, categorias })}
              />
            )}

            <RetornoDoEnvio erro={erroDoCnpj} />

            <div className="acesso__acoes">
              <button
                type="button"
                className="acesso__botao acesso__botao--secundario"
                onClick={voltar}
              >
                Voltar
              </button>
              <button type="submit" className="acesso__botao" disabled={verificando}>
                {verificando ? 'Verificando...' : 'Continuar'}
              </button>
            </div>
          </>
        )}

        {etapa === 3 && (
          <>
            <label className="campo">
              <span>E-mail</span>
              <input
                type="email"
                name="email"
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
              <EntradaDeSenha
                name="senha"
                autoComplete="new-password"
                data-validar="senha"
                placeholder="Mínimo de 8 caracteres"
                value={dados.senha}
                onChange={preencher('senha')}
                required
              />
              <small className="etapas__dica">Use pelo menos 8 caracteres.</small>
            </label>

            <label className="campo">
              <span>Confirmar senha</span>
              <EntradaDeSenha
                name="confirmacaoSenha"
                autoComplete="new-password"
                placeholder="Repita a senha"
                value={dados.confirmacaoSenha}
                onChange={preencher('confirmacaoSenha')}
                required
              />
            </label>

            <p className="acesso__aviso">
              Ao enviar, o cadastro fica pendente até a aprovação do administrador.
            </p>

            <RetornoDoEnvio erro={erro} />

            <div className="acesso__acoes">
              <button
                type="button"
                className="acesso__botao acesso__botao--secundario"
                onClick={voltar}
              >
                Voltar
              </button>
              <button type="submit" className="acesso__botao" disabled={enviando}>
                {enviando ? 'Enviando...' : 'Enviar cadastro'}
              </button>
            </div>
          </>
        )}
      </form>

      <Link to="/entrar" className="acesso__link acesso__link--centro">
        Já tem conta? Entrar
      </Link>
    </AcessoLayout>
  )
}
