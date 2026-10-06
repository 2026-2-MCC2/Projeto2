import { useState } from 'react'
import { OrganizadorLayout } from '../components/organizador/OrganizadorLayout.jsx'
import {
  Acoes,
  Botao,
  Campo,
  CampoFixo,
  Linha,
  Painel,
} from '../components/organizador/Formulario.jsx'
import { useIsMobile } from '../hooks/useIsMobile.js'
import { Icone } from '../components/comum/Icone.jsx'
import iconeBloqueado from '../assets/organizador/icone-bloqueado.svg'
import iconePermitido from '../assets/organizador/icone-permitido.svg'

const ABA_SENHA = { id: 'senha', nome: 'Senha', nomeCurto: 'Senha' }
const ABA_PERFIL = { id: 'perfil', nome: 'Perfil de acesso', nomeCurto: 'Perfil' }

const CONFIGURACOES = {
  organizador: {
    apoio: 'Dados da conta e acesso à plataforma.',
    apoioMobile: 'Dados da conta e acesso',
    abas: [{ id: 'dados', nome: 'Dados cadastrais', nomeCurto: 'Dados' }, ABA_PERFIL, ABA_SENHA],
    empresa: {
      rotuloNome: 'Nome ou razão social',
      nome: 'TrocaTicket Produções Ltda.',
      responsavel: 'Lucas Santos',
      email: 'lucas@trocaticket.com.br',
    },
    perfil: {
      etiquetas: [{ nome: 'Organizador' }],
      aviso: 'O perfil é definido no cadastro e só pode ser alterado pelo administrador.',
      avisoMobile: 'Definido no cadastro e alterado apenas pelo administrador.',
      apoio: 'Define quais funcionalidades ficam disponíveis para você.',
      permissoes: [
        'Cadastrar e publicar eventos',
        'Registrar itens de custo do evento',
        'Comparar propostas e consolidar o orçamento',
        'Calcular o ticket estimado',
      ],
    },
  },
  fornecedor: {
    apoio: 'Dados da empresa e acesso à plataforma.',
    apoioMobile: 'Dados da empresa e acesso',
    abas: [
      { id: 'dados', nome: 'Dados cadastrais', nomeCurto: 'Dados' },
      { id: 'categorias', nome: 'Categorias de atuação', nomeCurto: 'Categorias' },
      ABA_PERFIL,
      ABA_SENHA,
    ],
    empresa: {
      rotuloNome: 'Razão social',
      nome: 'Sabor & Arte Gastronomia Ltda.',
      nomeMobile: 'Sabor & Arte Gastronomia',
      responsavel: 'Ana Lima',
      email: 'ana@saborarte.com.br',
      comEndereco: true,
    },
    perfil: {
      etiquetas: [{ nome: 'Fornecedor' }, { nome: 'Aprovado', classe: 'etiqueta--sucesso' }],
      apoio: 'Somente fornecedores aprovados podem enviar propostas.',
      permissoes: [
        'Consultar eventos abertos para cotação',
        'Enviar propostas para itens de custo',
        'Acompanhar a situação das propostas enviadas',
      ],
    },
  },
  admin: {
    apoio: 'Dados da conta administrativa.',
    apoioMobile: 'Dados da conta administrativa',
    abas: [{ id: 'dados', nome: 'Dados da conta', nomeCurto: 'Conta' }, ABA_PERFIL, ABA_SENHA],
    perfil: {
      etiquetas: [{ nome: 'Administrador' }],
      apoio: 'O administrador aprova cadastros e acompanha eventos e propostas.',
      permissoes: [
        'Aprovar ou rejeitar cadastros de organizadores e fornecedores',
        'Consultar eventos, custos e propostas da plataforma',
        'Acompanhar relatórios gerenciais',
      ],
    },
  },
}

const CATEGORIAS = [
  'Alimentação',
  'Bebidas',
  'Estrutura',
  'Decoração',
  'Segurança',
  'Logística',
  'Tecnologia',
  'Comunicação',
  'Equipe',
]

export function Configuracoes({ perfil = 'organizador' }) {
  const isMobile = useIsMobile()
  const [aba, setAba] = useState('dados')
  const config = CONFIGURACOES[perfil]

  return (
    <OrganizadorLayout
      perfil={perfil}
      titulo="Configurações"
      apoio={isMobile ? config.apoioMobile : config.apoio}
      estreito
    >
      <div
        className={`configuracoes__abas${config.abas.length > 3 ? ' configuracoes__abas--quatro' : ''}`}
      >
        {config.abas.map((opcao) => (
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

      {aba === 'dados' && config.empresa && (
        <DadosCadastrais empresa={config.empresa} isMobile={isMobile} />
      )}
      {aba === 'dados' && perfil === 'admin' && <DadosAdmin isMobile={isMobile} />}
      {aba === 'categorias' && <PainelCategorias isMobile={isMobile} />}
      {aba === 'perfil' && <PainelPerfil {...config.perfil} isMobile={isMobile} />}
      {aba === 'senha' && <PainelSenha />}
    </OrganizadorLayout>
  )
}

function PainelDados({ titulo = 'Dados cadastrais', apoio, children }) {
  return (
    <Painel titulo={titulo} apoio={apoio} onSubmit={(evento) => evento.preventDefault()}>
      {children}

      <Acoes>
        <Botao type="submit">Salvar alterações</Botao>
      </Acoes>
    </Painel>
  )
}

// no mobile o Figma mostra só nome, CNPJ, telefone e e-mail
function DadosCadastrais({ empresa, isMobile }) {
  const cnpj = (
    <CampoFixo
      rotulo="CNPJ"
      valor="12.345.678/0001-90"
      icone={iconeBloqueado}
      ajuda="O CNPJ não pode ser alterado depois da aprovação do cadastro."
    />
  )
  const telefone = (
    <Campo rotulo="Telefone">
      <input type="tel" placeholder="(11) 98765-4321" />
    </Campo>
  )
  const email = (
    <Campo rotulo="E-mail">
      <input type="email" placeholder={empresa.email} />
    </Campo>
  )

  if (isMobile) {
    return (
      <PainelDados apoio="Aprovados pelo administrador.">
        <Campo rotulo={empresa.rotuloNome} placeholder={empresa.nomeMobile ?? empresa.nome} />
        {cnpj}
        {telefone}
        {email}
      </PainelDados>
    )
  }

  return (
    <PainelDados apoio="Informações enviadas no cadastro e aprovadas pelo administrador.">
      <Campo rotulo={empresa.rotuloNome} placeholder={empresa.nome} />

      <Linha>
        {cnpj}
        {telefone}
      </Linha>

      <Linha>
        <Campo rotulo="Responsável" placeholder={empresa.responsavel} />
        {email}
      </Linha>

      {empresa.comEndereco && (
        <Linha>
          <Campo rotulo="Cidade" placeholder="São Paulo" />
          <Campo rotulo="Estado" placeholder="SP" />
        </Linha>
      )}
    </PainelDados>
  )
}

function DadosAdmin({ isMobile }) {
  return (
    <PainelDados
      titulo="Dados da conta"
      apoio={
        isMobile
          ? 'Identificação do administrador.'
          : 'Identificação do administrador da plataforma.'
      }
    >
      <Linha>
        <Campo rotulo="Nome" placeholder="Admin TrocaTicket" />
        <Campo rotulo="E-mail">
          <input type="email" placeholder="admin@trocaticket.com.br" />
        </Campo>
      </Linha>
    </PainelDados>
  )
}

function PainelCategorias({ isMobile }) {
  const [selecionadas, setSelecionadas] = useState(['Alimentação', 'Bebidas'])
  const categorias = isMobile ? CATEGORIAS.slice(0, 4) : CATEGORIAS

  function alternar(categoria) {
    setSelecionadas((atuais) =>
      atuais.includes(categoria)
        ? atuais.filter((item) => item !== categoria)
        : [...atuais, categoria],
    )
  }

  return (
    <Painel
      titulo="Categorias de atuação"
      apoio="Definem em quais itens de custo você recebe oportunidades de cotação."
      onSubmit={(evento) => evento.preventDefault()}
    >
      <div className="categorias">
        {categorias.map((categoria) => {
          const ativa = selecionadas.includes(categoria)
          return (
            <button
              key={categoria}
              type="button"
              aria-pressed={ativa}
              className={`categoria${ativa ? ' categoria--ativa' : ''}`}
              onClick={() => alternar(categoria)}
            >
              {categoria}
            </button>
          )
        })}
      </div>

      {!isMobile && (
        <p className="categorias__aviso">
          Você só enxerga eventos com itens abertos nas categorias selecionadas.
        </p>
      )}

      <Acoes>
        <Botao type="submit">Salvar alterações</Botao>
      </Acoes>
    </Painel>
  )
}

function PainelPerfil({ etiquetas, aviso, avisoMobile, apoio, permissoes, isMobile }) {
  return (
    <Painel titulo="Perfil de acesso" apoio={apoio}>
      <div className={`painel__perfil${aviso ? '' : ' painel__perfil--so-etiquetas'}`}>
        {etiquetas.map((etiqueta) => (
          <span key={etiqueta.nome} className={`etiqueta ${etiqueta.classe ?? ''}`.trim()}>
            {etiqueta.nome}
          </span>
        ))}
        {aviso && <p>{isMobile ? avisoMobile : aviso}</p>}
      </div>

      <ul className="permissoes">
        {permissoes.map((permissao) => (
          <li key={permissao}>
            <Icone src={iconePermitido} />
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
