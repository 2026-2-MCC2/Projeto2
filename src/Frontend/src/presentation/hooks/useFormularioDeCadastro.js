import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { validarConfirmacaoSenha } from '../../domain/validacao.js'
import { useEnvioCadastro } from './useEnvioCadastro.js'
import { useVerificacaoDeCnpj } from './useVerificacaoDeCnpj.js'

export const ETAPAS_DO_CADASTRO = ['Perfil', 'Dados da empresa', 'Acesso']
const ETAPA_DO_CNPJ = 2

export const PERFIS_DO_CADASTRO = [
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

export const REGRAS_ENTRE_CAMPOS = {
  confirmacaoSenha: (valor, valores) => validarConfirmacaoSenha(valor, valores.senha),
}

const DADOS_INICIAIS = {
  perfil: 'organizador',
  nome: '',
  categorias: [],
  cnpj: '',
  telefone: '',
  email: '',
  senha: '',
  confirmacaoSenha: '',
}

// /cadastro?perfil=fornecedor já abre com o fornecedor marcado (os cartões da landing usam isso)
function perfilPedido(perfil) {
  return PERFIS_DO_CADASTRO.some((opcao) => opcao.id === perfil) ? perfil : DADOS_INICIAIS.perfil
}

// acima das versões desktop e mobile: girar o tablet troca a tela sem apagar o que foi preenchido
export function useFormularioDeCadastro() {
  const [etapa, setEtapa] = useState(1)
  const [parametros] = useSearchParams()
  const [dados, setDados] = useState(() => ({
    ...DADOS_INICIAIS,
    perfil: perfilPedido(parametros.get('perfil')),
  }))
  const { enviar, enviando, erro } = useEnvioCadastro()
  const { verificando, erroDoCnpj, cnpjEstaLivre, limparErroDoCnpj } = useVerificacaoDeCnpj()

  function preencher(campo) {
    return (evento) => {
      if (campo === 'cnpj') limparErroDoCnpj()
      const valor = evento.target.value
      setDados((atuais) => ({ ...atuais, [campo]: valor }))
    }
  }

  // categorias são só do fornecedor: recomeçam vazias ao trocar de perfil
  function escolherPerfil(perfil) {
    setDados((atuais) => ({ ...atuais, perfil: perfil, categorias: [] }))
  }

  function escolherCategorias(categorias) {
    setDados((atuais) => ({ ...atuais, categorias: categorias }))
  }

  function voltarEtapa() {
    setEtapa((atual) => Math.max(1, atual - 1))
  }

  async function avancar(evento) {
    evento.preventDefault()

    if (etapa === ETAPA_DO_CNPJ && !(await cnpjEstaLivre(dados.cnpj))) return

    if (etapa < ETAPAS_DO_CADASTRO.length) {
      setEtapa(etapa + 1)
      return
    }

    enviar(dados)
  }

  return {
    etapa,
    dados,
    naEtapaDoCnpj: etapa === ETAPA_DO_CNPJ,
    naUltimaEtapa: etapa === ETAPAS_DO_CADASTRO.length,
    preencher,
    escolherPerfil,
    escolherCategorias,
    voltarEtapa,
    avancar,
    enviando,
    erro,
    verificando,
    erroDoCnpj,
  }
}
