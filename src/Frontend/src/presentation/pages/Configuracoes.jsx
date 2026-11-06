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
import {
  carregarPerfilAtual,
  salvarMeusDados,
  salvarMinhasCategorias,
  trocarMinhaSenha,
} from '../../application/sessao.js'
import { toast } from '../toasts.js'
import { Carregando, ErroNaTela } from '../components/comum/EstadoDaTela.jsx'
import { validarConfirmacaoSenha } from '../../domain/validacao.js'
import { Icone } from '../components/comum/Icone.jsx'
import iconeBloqueado from '../assets/organizador/icone-bloqueado.svg'
import iconePermitido from '../assets/organizador/icone-permitido.svg'
import { EntradaDeSenha } from '../components/comum/EntradaDeSenha.jsx'

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
      responsavel: 'Ana Lima',
      email: 'ana@saborarte.com.br',
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
  // os campos só aparecem com os dados do /me: valor inicial de input não muda depois de montado
  const [perfilCarregado, setPerfilCarregado] = useState({ situacao: 'carregando', usuario: null })
  const [tentativa, setTentativa] = useState(0)
  const config = CONFIGURACOES[perfil]
  const usuario = perfilCarregado.usuario

  useEffect(() => {
    let telaAberta = true
    carregarPerfilAtual()
      .then((dados) => {
        if (telaAberta) setPerfilCarregado({ situacao: 'pronto', usuario: dados })
      })
      .catch((erro) => {
        if (telaAberta) setPerfilCarregado({ situacao: 'erro', usuario: null, erro })
      })
    return () => {
      telaAberta = false
    }
  }, [tentativa])

  function tentarDeNovo() {
    setPerfilCarregado({ situacao: 'carregando', usuario: null })
    setTentativa((atual) => atual + 1)
  }

  const perfilPronto = perfilCarregado.situacao === 'pronto'
  const abaPrecisaDoPerfil = aba === 'dados' || aba === 'categorias'
  const aoSalvarPerfil = (dados) => setPerfilCarregado({ situacao: 'pronto', usuario: dados })

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

      {abaPrecisaDoPerfil && perfilCarregado.situacao === 'carregando' && (
        <Carregando mensagem="Carregando seus dados…" />
      )}
      {abaPrecisaDoPerfil && perfilCarregado.situacao === 'erro' && (
        <ErroNaTela erro={perfilCarregado.erro} aoTentarDeNovo={tentarDeNovo} />
      )}
      {aba === 'dados' && perfilPronto && config.empresa && (
        <DadosCadastrais
          empresa={config.empresa}
          usuario={usuario}
          isMobile={isMobile}
          aoSalvar={aoSalvarPerfil}
        />
      )}
      {aba === 'dados' && perfilPronto && perfil === 'admin' && (
        <DadosAdmin usuario={usuario} isMobile={isMobile} aoSalvar={aoSalvarPerfil} />
      )}
      {aba === 'categorias' && perfilPronto && (
        <PainelCategorias usuario={usuario} isMobile={isMobile} aoSalvar={aoSalvarPerfil} />
      )}
      {aba === 'perfil' && <PainelPerfil {...config.perfil} isMobile={isMobile} />}
      {aba === 'senha' && <PainelSenha />}
    </OrganizadorLayout>
  )
}

async function salvarComAviso(acao, mensagemDeSucesso, aoSalvar) {
  try {
    const resultado = await acao()
    toast.sucesso(mensagemDeSucesso)
    aoSalvar?.(resultado)
    return true
  } catch (falha) {
    toast.erro('Não foi possível salvar', { descricao: falha.message })
    return false
  }
}

function PainelDados({ titulo = 'Dados cadastrais', apoio, aoEnviar, children }) {
  const validacao = useValidacao()
  const [enviando, setEnviando] = useState(false)

  async function enviar(evento) {
    evento.preventDefault()
    setEnviando(true)
    await aoEnviar()
    setEnviando(false)
  }

  return (
    <Painel titulo={titulo} apoio={apoio} onSubmit={enviar} {...validacao}>
      {children}

      <Acoes>
        <Botao type="submit" disabled={enviando}>
          {enviando ? 'Salvando...' : 'Salvar alterações'}
        </Botao>
      </Acoes>
    </Painel>
  )
}

const AJUDA_DO_EMAIL = 'O e-mail é o seu login e não muda por aqui.'

// no mobile o figma mostra só nome, cnpj, telefone e e-mail
function DadosCadastrais({ empresa, usuario, isMobile, aoSalvar }) {
  const [dados, setDados] = useState({
    name: usuario.name ?? '',
    phone: usuario.phone ? formatarTelefone(usuario.phone) : '',
    responsible_name: usuario.responsible_name ?? '',
    city: usuario.city ?? '',
    state: usuario.state ?? '',
  })
  const campo = (nome) => ({
    value: dados[nome],
    onChange: (evento) => setDados((atual) => ({ ...atual, [nome]: evento.target.value })),
  })

  // no celular a tela não mostra responsável nem endereço, então eles não são enviados
  const camposDaTela = isMobile ? ['name', 'phone'] : Object.keys(dados)
  const salvar = () =>
    salvarComAviso(
      () => salvarMeusDados(Object.fromEntries(camposDaTela.map((nome) => [nome, dados[nome]]))),
      'Dados atualizados',
      aoSalvar,
    )

  const cnpj = (
    <CampoFixo
      rotulo="CNPJ"
      valor={usuario.cnpj ? formatarCnpj(usuario.cnpj) : '—'}
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
        placeholder="(11) 90000-0000"
        required
        {...campo('phone')}
      />
    </Campo>
  )
  const email = (
    <CampoFixo
      rotulo="E-mail"
      valor={usuario.email}
      icone={iconeBloqueado}
      ajuda={AJUDA_DO_EMAIL}
    />
  )
  const nome = (
    <Campo rotulo={empresa.rotuloNome}>
      <input type="text" maxLength={150} placeholder={empresa.nome} required {...campo('name')} />
    </Campo>
  )

  if (isMobile) {
    return (
      <PainelDados apoio="Aprovados pelo administrador." aoEnviar={salvar}>
        {nome}
        {cnpj}
        {telefone}
        {email}
      </PainelDados>
    )
  }

  return (
    <PainelDados
      apoio="Informações enviadas no cadastro e aprovadas pelo administrador."
      aoEnviar={salvar}
    >
      {nome}

      <Linha>
        {cnpj}
        {telefone}
      </Linha>

      <Linha>
        <Campo rotulo="Responsável">
          <input
            type="text"
            maxLength={150}
            placeholder={empresa.responsavel}
            {...campo('responsible_name')}
          />
        </Campo>
        {email}
      </Linha>

      <Linha>
        <Campo rotulo="Cidade" maxLength={100} placeholder="São Paulo" {...campo('city')} />
        <Campo rotulo="Estado" data-validar="estado" placeholder="SP" {...campo('state')} />
      </Linha>
    </PainelDados>
  )
}

function DadosAdmin({ usuario, isMobile, aoSalvar }) {
  const [nome, setNome] = useState(usuario.name ?? '')
  const salvar = () =>
    salvarComAviso(() => salvarMeusDados({ name: nome }), 'Dados atualizados', aoSalvar)

  return (
    <PainelDados
      titulo="Dados da conta"
      apoio={
        isMobile
          ? 'Identificação do administrador.'
          : 'Identificação do administrador da plataforma.'
      }
      aoEnviar={salvar}
    >
      <Linha>
        <Campo rotulo="Nome">
          <input
            type="text"
            maxLength={150}
            required
            value={nome}
            onChange={(evento) => setNome(evento.target.value)}
          />
        </Campo>
        <CampoFixo
          rotulo="E-mail"
          valor={usuario.email}
          icone={iconeBloqueado}
          ajuda={AJUDA_DO_EMAIL}
        />
      </Linha>
    </PainelDados>
  )
}

function PainelCategorias({ usuario, isMobile, aoSalvar }) {
  const [selecionadas, setSelecionadas] = useState(usuario.categories ?? [])
  const [enviando, setEnviando] = useState(false)

  function alternar(categoria) {
    setSelecionadas((atuais) =>
      atuais.includes(categoria)
        ? atuais.filter((item) => item !== categoria)
        : [...atuais, categoria],
    )
  }

  async function salvar(evento) {
    evento.preventDefault()
    if (selecionadas.length === 0) {
      toast.erro('Escolha pelo menos uma categoria')
      return
    }
    setEnviando(true)
    await salvarComAviso(
      () => salvarMinhasCategorias(selecionadas),
      'Categorias atualizadas',
      aoSalvar,
    )
    setEnviando(false)
  }

  return (
    <Painel
      titulo="Categorias de atuação"
      apoio="Definem em quais itens de custo você recebe oportunidades de cotação."
      onSubmit={salvar}
    >
      <div className="categorias">
        {CATEGORIAS_DE_ATUACAO.map((categoria) => {
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
        <Botao type="submit" disabled={enviando}>
          {enviando ? 'Salvando...' : 'Salvar alterações'}
        </Botao>
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

const SENHAS_EM_BRANCO = { senhaAtual: '', novaSenha: '', confirmacaoSenha: '' }

function PainelSenha() {
  const validacao = useValidacao({
    confirmacaoSenha: (valor, valores) => validarConfirmacaoSenha(valor, valores.novaSenha),
  })
  const [senhas, setSenhas] = useState(SENHAS_EM_BRANCO)
  const [enviando, setEnviando] = useState(false)

  async function salvar(evento) {
    evento.preventDefault()
    setEnviando(true)
    const salvou = await salvarComAviso(() => trocarMinhaSenha(senhas), 'Senha alterada')
    if (salvou) setSenhas(SENHAS_EM_BRANCO)
    setEnviando(false)
  }

  return (
    <Painel
      titulo="Senha"
      apoio="Use uma senha com pelo menos 8 caracteres. Os acessos em outros aparelhos são encerrados."
      onSubmit={salvar}
      {...validacao}
    >
      <Linha>
        {CAMPOS_DE_SENHA.map((item) => (
          <Campo key={item.nome} rotulo={item.rotulo}>
            <EntradaDeSenha
              name={item.nome}
              autoComplete={item.preencher ?? 'new-password'}
              placeholder={item.placeholder}
              data-validar={item.regra}
              maxLength={72}
              required
              value={senhas[item.nome]}
              onChange={(evento) =>
                setSenhas((atuais) => ({ ...atuais, [item.nome]: evento.target.value }))
              }
            />
          </Campo>
        ))}
      </Linha>

      <Acoes>
        <Botao type="submit" disabled={enviando}>
          {enviando ? 'Salvando...' : 'Salvar alterações'}
        </Botao>
      </Acoes>
    </Painel>
  )
}
