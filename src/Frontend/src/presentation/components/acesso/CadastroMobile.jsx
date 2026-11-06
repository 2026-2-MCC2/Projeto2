import { BotaoAcessibilidade } from '../comum/BotaoAcessibilidade.jsx'
import { Logotipo } from '../comum/Logotipo.jsx'
import { useNavigate } from 'react-router-dom'
import { Icone } from '../comum/Icone.jsx'
import { ProgressoEtapas } from '../comum/ProgressoEtapas.jsx'
import { TituloDaPagina } from '../comum/TituloDaPagina.jsx'
import { CampoCategoriasDeAtuacao } from './CampoCategoriasDeAtuacao.jsx'
import { RetornoDoEnvio } from './RetornoDoEnvio.jsx'
import {
  ETAPAS_DO_CADASTRO,
  PERFIS_DO_CADASTRO,
  REGRAS_ENTRE_CAMPOS,
} from '../../hooks/useFormularioDeCadastro.js'
import { useValidacao } from '../../hooks/useValidacao.js'
import setaVoltar from '../../assets/acesso/seta-voltar.svg'
import perfilSelecionado from '../../assets/acesso/perfil-selecionado.svg'
import '../../styles/acesso.css'
import { EntradaDeSenha } from '../comum/EntradaDeSenha.jsx'
import { ROTA_DO_LOGIN } from '../../../application/sessao.js'

function textoDoBotao({ naUltimaEtapa, enviando, verificando }) {
  if (verificando) return 'Verificando...'
  if (!naUltimaEtapa) return 'Continuar'
  return enviando ? 'Enviando...' : 'Enviar cadastro'
}

export function CadastroMobile({ formulario }) {
  const navegar = useNavigate()
  const validacao = useValidacao(REGRAS_ENTRE_CAMPOS)
  const { etapa, dados, naEtapaDoCnpj, naUltimaEtapa, enviando, erro, verificando, erroDoCnpj } =
    formulario
  const { preencher, escolherPerfil, escolherCategorias, voltarEtapa, avancar } = formulario

  function voltar() {
    if (etapa === 1) {
      navegar(ROTA_DO_LOGIN)
      return
    }
    voltarEtapa()
  }

  return (
    <div className="etapas">
      <TituloDaPagina titulo="Criar cadastro" />
      <header className="etapas__barra">
        <div className="etapas__topo">
          <button type="button" className="etapas__voltar" onClick={voltar} aria-label="Voltar">
            <Icone src={setaVoltar} />
          </button>
          <Logotipo className="etapas__logo" />
          <BotaoAcessibilidade posicao="topo" />
        </div>

        <ProgressoEtapas etapas={ETAPAS_DO_CADASTRO} etapaAtual={etapa} />
      </header>

      <form className="etapas__form" onSubmit={avancar} {...validacao}>
        <div className="etapas__conteudo">
          {etapa === 1 && (
            <>
              <div className="etapas__titulos">
                <h1>Qual é o seu perfil?</h1>
                <p>Isso define o que você faz na plataforma.</p>
              </div>

              {PERFIS_DO_CADASTRO.map((opcao) => (
                <button
                  key={opcao.id}
                  type="button"
                  aria-pressed={dados.perfil === opcao.id}
                  className={`etapas__perfil${dados.perfil === opcao.id ? ' etapas__perfil--ativo' : ''}`}
                  onClick={() => escolherPerfil(opcao.id)}
                >
                  <span className="etapas__perfil-nome">
                    <strong>{opcao.nome}</strong>
                    {dados.perfil === opcao.id && <Icone src={perfilSelecionado} />}
                  </span>
                  <span className="etapas__perfil-resumo">{opcao.resumo}</span>
                </button>
              ))}

              <p className="etapas__nota">
                Cadastros passam por aprovação do administrador antes do primeiro acesso.
              </p>
            </>
          )}

          {etapa === 2 && (
            <>
              <div className="etapas__titulos">
                <h1>Dados da empresa</h1>
                <p>Informações usadas na análise do administrador.</p>
              </div>

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

              <label className="campo">
                <span>CNPJ</span>
                <input
                  type="text"
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
                  autoComplete="tel"
                  data-validar="telefone"
                  placeholder="(11) 90000-0000"
                  value={dados.telefone}
                  onChange={preencher('telefone')}
                  required
                />
              </label>

              {dados.perfil === 'fornecedor' && (
                <CampoCategoriasDeAtuacao
                  selecionadas={dados.categorias}
                  aoMudar={escolherCategorias}
                />
              )}
            </>
          )}

          {etapa === 3 && (
            <>
              <div className="etapas__titulos">
                <h1>Dados de acesso</h1>
                <p>Com esses dados você entra depois da aprovação.</p>
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
                <EntradaDeSenha
                  name="senha"
                  autoComplete="new-password"
                  maxLength={72}
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
                  maxLength={72}
                  placeholder="Repita a senha"
                  value={dados.confirmacaoSenha}
                  onChange={preencher('confirmacaoSenha')}
                  required
                />
              </label>

              <p className="acesso__aviso">
                Ao enviar, o cadastro fica pendente até a aprovação do administrador.
              </p>
            </>
          )}
        </div>

        <div className="etapas__acoes">
          {naEtapaDoCnpj && <RetornoDoEnvio erro={erroDoCnpj} />}
          {naUltimaEtapa && <RetornoDoEnvio erro={erro} />}

          <button type="submit" className="acesso__botao" disabled={enviando || verificando}>
            {textoDoBotao({ naUltimaEtapa, enviando, verificando })}
          </button>
        </div>
      </form>
    </div>
  )
}
