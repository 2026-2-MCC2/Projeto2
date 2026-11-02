import { useEffect, useState } from 'react'
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
import { useValidacao } from '../hooks/useValidacao.js'
import { CATEGORIAS_DE_ATUACAO } from '../../domain/categoriasDeAtuacao.js'
import { formatarCnpj, formatarTelefone } from '../../domain/formatacao.js'
import { carregarPerfilAtual, usuarioAtual } from '../../application/sessao.js'
import { validarConfirmacaoSenha } from '../../domain/validacao.js'
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

export function Configuracoes({ perfil = 'organizador' }) {
  const isMobile = useIsMobile()
  const [aba, setAba] = useState('dados')
  const [usuario, setUsuario] = useState(() => usuarioAtual())
  const config = CONFIGURACOES[perfil]

  useEffect(() => {
    let ativo = true
    carregarPerfilAtual()
      .then((dados) => {
        if (ativo && dados) setUsuario(dados)
      })
      .catch(() => {})
    return () => {
      ativo = false
    }
  }, [])

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
        <DadosCadastrais empresa={config.empresa} usuario={usuario} isMobile={isMobile} />
      )}
      {aba === 'dados' && perfil === 'admin' && (
        <DadosAdmin usuario={usuario} isMobile={isMobile} />
      )}
      {aba === 'categorias' && <PainelCategorias isMobile={isMobile} />}
      {aba === 'perfil' && <PainelPerfil {...config.perfil} isMobile={isMobile} />}
      {aba === 'senha' && <PainelSenha />}
    </OrganizadorLayout>
  )
}

// placeholder mostra o valor atual: campo vazio mantém o valor
function PainelDados({ titulo = 'Dados cadastrais', apoio, children }) {
  const validacao = useValidacao()

  return (
    <Painel
      titulo={titulo}
      apoio={apoio}
      onSubmit={(evento) => evento.preventDefault()}
      {...validacao}
    >
      {children}

      <Acoes>
        <Botao type="submit">Salvar alterações</Botao>
      </Acoes>
    </Painel>
  )
}

// no mobile o figma mostra só nome, cnpj, telefone e e-mail
function DadosCadastrais({ empresa, usuario, isMobile }) {
  const cnpjFormatado = usuario?.cnpj ? formatarCnpj(usuario.cnpj) : '—'
  const telefoneFormatado = usuario?.phone ? formatarTelefone(usuario.phone) : ''
  const nomeExibicao = usuario?.name || empresa.nome
  const responsavelExibicao = usuario?.responsible_name || empresa.responsavel
  const emailExibicao = usuario?.email || empresa.email

  const cnpj = (
    <CampoFixo
      rotulo="CNPJ"
      valor={cnpjFormatado}
      icone={iconeBloqueado}
      ajuda="O CNPJ não pode ser alterado depois da aprovação do cadastro."
    />
  )
  const telefone = (
    <Campo rotulo="Telefone">
      <input
        type="tel"
        autoComplete="tel"
        data-validar="telefone"
        defaultValue={telefoneFormatado}
        placeholder={telefoneFormatado || '(11) 90000-0000'}
      />
    </Campo>
  )
  const email = (
    <Campo rotulo="E-mail">
      <input
        type="email"
        autoComplete="email"
        data-validar="email"
        defaultValue={emailExibicao}
        placeholder={emailExibicao}
      />
    </Campo>
  )

  if (isMobile) {
    return (
      <PainelDados apoio="Aprovados pelo administrador.">
        <Campo rotulo={empresa.rotuloNome}>
          <input type="text" defaultValue={nomeExibicao} placeholder={nomeExibicao} />
        </Campo>
        {cnpj}
        {telefone}
        {email}
      </PainelDados>
    )
  }

  return (
    <PainelDados apoio="Informações enviadas no cadastro e aprovadas pelo administrador.">
      <Campo rotulo={empresa.rotuloNome}>
        <input type="text" defaultValue={nomeExibicao} placeholder={nomeExibicao} />
      </Campo>

      <Linha>
        {cnpj}
        {telefone}
      </Linha>

      <Linha>
        <Campo rotulo="Responsável">
          <input type="text" defaultValue={responsavelExibicao} placeholder={responsavelExibicao} />
        </Campo>
        {email}
      </Linha>

      {empresa.comEndereco && (
        <Linha>
          <Campo rotulo="Cidade" placeholder={usuario?.city || 'São Paulo'} />
          <Campo rotulo="Estado" placeholder={usuario?.state || 'SP'} />
        </Linha>
      )}
    </PainelDados>
  )
}

function DadosAdmin({ usuario, isMobile }) {
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
        <Campo rotulo="Nome">
          <input
            type="text"
            defaultValue={usuario?.name || 'Admin TrocaTicket'}
            placeholder={usuario?.name || 'Admin TrocaTicket'}
          />
        </Campo>
        <Campo rotulo="E-mail">
          <input
            type="email"
            autoComplete="email"
            data-validar="email"
            defaultValue={usuario?.email || 'admin@trocaticket.com.br'}
            placeholder={usuario?.email || 'admin@trocaticket.com.br'}
          />
        </Campo>
      </Linha>
    </PainelDados>
  )
}

function PainelCategorias({ isMobile }) {
  const [selecionadas, setSelecionadas] = useState(['Alimentação', 'Bebidas'])
  const categorias = isMobile ? CATEGORIAS_DE_ATUACAO.slice(0, 4) : CATEGORIAS_DE_ATUACAO

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
  {
    nome: 'senhaAtual',
    rotulo: 'Senha atual',
    placeholder: '••••••••',
    preencher: 'current-password',
  },
  {
    nome: 'novaSenha',
    rotulo: 'Nova senha',
    placeholder: 'Mínimo de 8 caracteres',
    regra: 'senha',
  },
  { nome: 'confirmacaoSenha', rotulo: 'Confirmar nova senha', placeholder: 'Repita a nova senha' },
]

function PainelSenha() {
  const validacao = useValidacao({
    confirmacaoSenha: (valor, valores) => validarConfirmacaoSenha(valor, valores.novaSenha),
  })

  return (
    <Painel
      titulo="Senha"
      apoio="Use uma senha com pelo menos 8 caracteres."
      onSubmit={(evento) => evento.preventDefault()}
      {...validacao}
    >
      <Linha>
        {CAMPOS_DE_SENHA.map((item) => (
          <Campo key={item.nome} rotulo={item.rotulo}>
            <input
              type="password"
              name={item.nome}
              autoComplete={item.preencher ?? 'new-password'}
              placeholder={item.placeholder}
              data-validar={item.regra}
              required
            />
          </Campo>
        ))}
      </Linha>

      <Acoes>
        <Botao type="submit">Salvar alterações</Botao>
      </Acoes>
    </Painel>
  )
}
