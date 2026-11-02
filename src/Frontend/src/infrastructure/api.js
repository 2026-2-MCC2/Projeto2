import { lerSessao, limparSessao } from './armazenamentoDaSessao.js'

const URL_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3300/event_planning'

// no login, 401 é senha errada e 403 é cadastro em análise: a tela mostra o erro em vez de encerrar a sessão
const CAMINHO_DO_LOGIN = '/auth/login'

// 403 com este código: a conta foi bloqueada ou o perfil mudou depois do login
const CODIGO_DE_ACESSO_NEGADO = 'APP000403'

async function requisitar(caminho, opcoes = {}) {
  const resposta = await enviar(caminho, opcoes)

  if (!resposta.ok) {
    const erro = await criarErroDaApi(resposta)
    if (caminho !== CAMINHO_DO_LOGIN && sessaoPerdeuValidade(erro)) {
      encerrarSessaoVencida()
    }
    throw erro
  }

  return lerCorpo(resposta)
}

// 202 e 204 chegam sem corpo
async function lerCorpo(resposta) {
  const texto = await resposta.text()
  return texto ? JSON.parse(texto) : null
}

// as rotas públicas ignoram o token
async function enviar(caminho, opcoes) {
  const token = lerSessao()?.token
  try {
    return await fetch(`${URL_BASE}${caminho}`, {
      ...opcoes,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    })
  } catch {
    // o fetch só lança quando a requisição nem chega ao backend (fora do ar ou sem internet)
    const erro = new Error('Não foi possível conectar ao servidor. Tente novamente em instantes.')
    erro.status = null
    erro.codigo = null
    throw erro
  }
}

function sessaoPerdeuValidade(erro) {
  return erro.status === 401 || (erro.status === 403 && erro.codigo === CODIGO_DE_ACESSO_NEGADO)
}

// o recarregamento completo descarta qualquer dado da área logada que estivesse na tela
function encerrarSessaoVencida() {
  limparSessao()
  if (window.location.pathname !== '/') {
    window.location.assign('/')
  }
}

// a translation do backend já vem em português, pronta para mostrar
async function criarErroDaApi(resposta) {
  const corpo = await lerCorpoDoErro(resposta)

  const erro = new Error(corpo?.translation ?? `Erro ${resposta.status} ao chamar a API`)
  erro.status = resposta.status
  erro.codigo = corpo?.code ?? null
  erro.detalhes = corpo?.details ?? null
  return erro
}

// nem toda resposta de erro tem json (ex.: proxy devolvendo html)
async function lerCorpoDoErro(resposta) {
  try {
    return await resposta.json()
  } catch {
    return null
  }
}

export const api = {
  get(caminho) {
    return requisitar(caminho)
  },

  post(caminho, dados) {
    return requisitar(caminho, {
      method: 'POST',
      body: JSON.stringify(dados),
    })
  },

  put(caminho, dados) {
    return requisitar(caminho, {
      method: 'PUT',
      body: JSON.stringify(dados),
    })
  },

  patch(caminho, dados) {
    return requisitar(caminho, {
      method: 'PATCH',
      body: JSON.stringify(dados),
    })
  },
}
