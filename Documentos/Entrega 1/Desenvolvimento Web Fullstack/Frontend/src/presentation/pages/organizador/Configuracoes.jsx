import { useState } from 'react'
import { OrganizadorLayout } from '../../components/organizador/OrganizadorLayout.jsx'
import {
  Acoes,
  Botao,
  Campo,
  CampoFixo,
  Linha,
  Painel,
} from '../../components/organizador/Formulario.jsx'
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
    <Painel
      titulo="Dados cadastrais"
      apoio={
        isMobile
          ? 'Aprovados pelo administrador.'
          : 'Informações enviadas no cadastro e aprovadas pelo administrador.'
      }
      onSubmit={(evento) => evento.preventDefault()}
    >
      <Campo rotulo="Nome ou razão social" placeholder="TrocaTicket Produções Ltda." />

      <Linha>
        <CampoFixo
          rotulo="CNPJ"
          valor="12.345.678/0001-90"
          icone={iconeBloqueado}
          ajuda="O CNPJ não pode ser alterado depois da aprovação do cadastro."
        />
        <Campo rotulo="Telefone">
          <input type="tel" placeholder="(11) 98765-4321" />
        </Campo>
      </Linha>

      <Linha>
        <Campo rotulo="Responsável" placeholder="Chico Trento" />
        <Campo rotulo="E-mail">
          <input type="email" placeholder="chico@trocaticket.com.br" />
        </Campo>
      </Linha>

      <Acoes>
        <Botao type="submit">Salvar alterações</Botao>
      </Acoes>
    </Painel>
  )
}

function PainelPerfil({ isMobile }) {
  return (
    <Painel
      titulo="Perfil de acesso"
      apoio="Define quais funcionalidades ficam disponíveis para você."
    >
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
    </Painel>
  )
}

const CAMPOS_DE_SENHA = [
  { rotulo: 'Senha atual', placeholder: '••••••••' },
  { rotulo: 'Nova senha', placeholder: 'Mínimo de 8 caracteres', minimo: 8 },
  { rotulo: 'Confirmar nova senha', placeholder: 'Repita a nova senha', minimo: 8 },
]

function PainelSenha() {
  return (
    <Painel
      titulo="Senha"
      apoio="Use uma senha com pelo menos 8 caracteres."
      onSubmit={(evento) => evento.preventDefault()}
    >
      <Linha>
        {CAMPOS_DE_SENHA.map((item) => (
          <Campo key={item.rotulo} rotulo={item.rotulo}>
            <input type="password" placeholder={item.placeholder} minLength={item.minimo} />
          </Campo>
        ))}
      </Linha>

      <Acoes>
        <Botao type="submit">Salvar alterações</Botao>
      </Acoes>
    </Painel>
  )
}
