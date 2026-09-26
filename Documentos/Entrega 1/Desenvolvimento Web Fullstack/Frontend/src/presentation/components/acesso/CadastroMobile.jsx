import { useState } from 'react'
import { BotaoAcessibilidade } from '../comum/BotaoAcessibilidade.jsx'
import { useNavigate } from 'react-router-dom'
import logotipo from '../../assets/acesso/logotipo-trocaticket.png'
import setaVoltar from '../../assets/acesso/seta-voltar.svg'
import perfilSelecionado from '../../assets/acesso/perfil-selecionado.svg'
import '../../styles/acesso.css'

const ETAPAS = ['Perfil', 'Dados da empresa', 'Acesso']

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

const DADOS_INICIAIS = {
  perfil: 'organizador',
  razaoSocial: '',
  cnpj: '',
  telefone: '',
  cidade: '',
  email: '',
  senha: '',
  confirmacaoSenha: '',
}

export function CadastroMobile() {
  const navegar = useNavigate()
  const [etapa, setEtapa] = useState(1)
  const [dados, setDados] = useState(DADOS_INICIAIS)

  function preencher(campo) {
    return (evento) => setDados({ ...dados, [campo]: evento.target.value })
  }

  function voltar() {
    if (etapa === 1) {
      navegar('/')
      return
    }
    setEtapa(etapa - 1)
  }

  function aoEnviar(evento) {
    evento.preventDefault()

    if (etapa < ETAPAS.length) {
      setEtapa(etapa + 1)
      return
    }

    // Ainda não há backend: por enquanto o envio apenas simula o fluxo de aprovação.
    navegar('/cadastro-pendente')
  }

  return (
    <div className="etapas">
      <header className="etapas__barra">
        <div className="etapas__topo">
          <button type="button" className="etapas__voltar" onClick={voltar} aria-label="Voltar">
            <img src={setaVoltar} alt="" />
          </button>
          <img src={logotipo} alt="TrocaTicket" className="etapas__logo" />
          <BotaoAcessibilidade posicao="topo" />
        </div>

        <div className="etapas__progresso">
          <div className="etapas__legenda">
            <strong>
              Etapa {etapa} de {ETAPAS.length}
            </strong>
            <span>{ETAPAS[etapa - 1]}</span>
          </div>

          <div className="etapas__trilho">
            {ETAPAS.map((rotulo, indice) => (
              <span
                key={rotulo}
                className={`etapas__segmento etapas__segmento--${situacaoDaEtapa(indice + 1, etapa)}`}
              />
            ))}
          </div>
        </div>
      </header>

      <form className="etapas__form" onSubmit={aoEnviar}>
        <div className="etapas__conteudo">
          {etapa === 1 && (
            <>
              <div className="etapas__titulos">
                <h1>Qual é o seu perfil?</h1>
                <p>Isso define o que você faz na plataforma.</p>
              </div>

              {PERFIS.map((opcao) => (
                <button
                  key={opcao.id}
                  type="button"
                  className={`etapas__perfil${dados.perfil === opcao.id ? ' etapas__perfil--ativo' : ''}`}
                  onClick={() => setDados({ ...dados, perfil: opcao.id })}
                >
                  <span className="etapas__perfil-nome">
                    <strong>{opcao.nome}</strong>
                    {dados.perfil === opcao.id && <img src={perfilSelecionado} alt="" />}
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
                  placeholder="TrocaTicket Produções Ltda."
                  value={dados.razaoSocial}
                  onChange={preencher('razaoSocial')}
                  required
                />
              </label>

              <label className="campo">
                <span>CNPJ</span>
                <input
                  type="text"
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
                  placeholder="(11) 90000-0000"
                  value={dados.telefone}
                  onChange={preencher('telefone')}
                  required
                />
              </label>

              <label className="campo">
                <span>Cidade e estado</span>
                <input
                  type="text"
                  placeholder="São Paulo, SP"
                  value={dados.cidade}
                  onChange={preencher('cidade')}
                  required
                />
              </label>
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
                  placeholder="Mínimo de 8 caracteres"
                  minLength={8}
                  value={dados.senha}
                  onChange={preencher('senha')}
                  required
                />
                <small className="etapas__dica">Use pelo menos 8 caracteres.</small>
              </label>

              <label className="campo">
                <span>Confirmar senha</span>
                <input
                  type="password"
                  placeholder="Repita a senha"
                  minLength={8}
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
          <button type="submit" className="acesso__botao">
            {etapa < ETAPAS.length ? 'Continuar' : 'Enviar cadastro'}
          </button>
        </div>
      </form>
    </div>
  )
}

function situacaoDaEtapa(numero, etapaAtual) {
  if (numero < etapaAtual) return 'concluida'
  if (numero === etapaAtual) return 'atual'
  return 'pendente'
}
