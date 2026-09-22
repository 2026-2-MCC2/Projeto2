import { useState } from 'react'
import { OrganizadorLayout } from '../../components/organizador/OrganizadorLayout.jsx'
import { useIsMobile } from '../../hooks/useIsMobile.js'
import iconeBloqueado from '../../assets/organizador/icone-bloqueado.svg'
import iconePermitido from '../../assets/organizador/icone-permitido.svg'

const ABAS = [
  { id: 'dados', nome: 'Dados cadastrais', nomeCurto: 'Dados' },
  { id: 'perfil', nome: 'Perfil de acesso', nomeCurto: 'Perfil' },
  { id: 'senha', nome: 'Senha', nomeCurto: 'Senha' },
]

const PERMISSOES = [
  'Cadastrar e publicar eventos',
  'Registrar itens de custo do evento',
  'Comparar propostas e consolidar o orçamento',
  'Calcular o ticket estimado',
]

export function Configuracoes() {
  const isMobile = useIsMobile()
  const [aba, setAba] = useState('dados')

  return (
    <OrganizadorLayout
      titulo="Configurações"
      apoio={isMobile ? 'Dados da conta e acesso' : 'Dados da conta e acesso à plataforma.'}
      estreito
    >
      <div className="configuracoes__abas">
        {ABAS.map((opcao) => (
          <button
            key={opcao.id}
            type="button"
            className={`configuracoes__aba${aba === opcao.id ? ' configuracoes__aba--ativa' : ''}`}
            onClick={() => setAba(opcao.id)}
          >
            {isMobile ? opcao.nomeCurto : opcao.nome}
          </button>
        ))}
      </div>

      {aba === 'dados' && <PainelDados isMobile={isMobile} />}
      {aba === 'perfil' && <PainelPerfil isMobile={isMobile} />}
      {aba === 'senha' && <PainelSenha />}
    </OrganizadorLayout>
  )
}

function PainelDados({ isMobile }) {
  return (
    <form className="painel" onSubmit={(evento) => evento.preventDefault()}>
      <div className="painel__titulo">
        <h2>Dados cadastrais</h2>
        <p>
          {isMobile
            ? 'Aprovados pelo administrador.'
            : 'Informações enviadas no cadastro e aprovadas pelo administrador.'}
        </p>
      </div>

      <label className="campo">
        <span>Nome ou razão social</span>
        <input type="text" placeholder="TrocaTicket Produções Ltda." />
      </label>

      <div className="painel__linha">
        <div className="campo">
          <span>CNPJ</span>
          <p className="campo__bloqueado">
            12.345.678/0001-90
            <img src={iconeBloqueado} alt="" />
          </p>
          <small>O CNPJ não pode ser alterado depois da aprovação do cadastro.</small>
        </div>

        <label className="campo">
          <span>Telefone</span>
          <input type="tel" placeholder="(11) 98765-4321" />
        </label>
      </div>

      <div className="painel__linha">
        <label className="campo">
          <span>Responsável</span>
          <input type="text" placeholder="Chico Trento" />
        </label>

        <label className="campo">
          <span>E-mail</span>
          <input type="email" placeholder="chico@trocaticket.com.br" />
        </label>
      </div>

      <div className="painel__acoes">
        <button type="submit" className="botao">
          Salvar alterações
        </button>
      </div>
    </form>
  )
}

function PainelPerfil({ isMobile }) {
  return (
    <section className="painel">
      <div className="painel__titulo">
        <h2>Perfil de acesso</h2>
        <p>Define quais funcionalidades ficam disponíveis para você.</p>
      </div>

      <div className="painel__perfil">
        <span className="etiqueta">Organizador</span>
        <p>
          {isMobile
            ? 'Definido no cadastro e alterado apenas pelo administrador.'
            : 'O perfil é definido no cadastro e só pode ser alterado pelo administrador.'}
        </p>
      </div>

      <ul className="permissoes">
        {PERMISSOES.map((permissao) => (
          <li key={permissao}>
            <img src={iconePermitido} alt="" />
            {permissao}
          </li>
        ))}
      </ul>
    </section>
  )
}

function PainelSenha() {
  return (
    <form className="painel" onSubmit={(evento) => evento.preventDefault()}>
      <div className="painel__titulo">
        <h2>Senha</h2>
        <p>Use uma senha com pelo menos 8 caracteres.</p>
      </div>

      <div className="painel__linha">
        <label className="campo">
          <span>Senha atual</span>
          <input type="password" placeholder="••••••••" />
        </label>

        <label className="campo">
          <span>Nova senha</span>
          <input type="password" placeholder="Mínimo de 8 caracteres" minLength={8} />
        </label>

        <label className="campo">
          <span>Confirmar nova senha</span>
          <input type="password" placeholder="Repita a nova senha" minLength={8} />
        </label>
      </div>

      <div className="painel__acoes">
        <button type="submit" className="botao">
          Salvar alterações
        </button>
      </div>
    </form>
  )
}
