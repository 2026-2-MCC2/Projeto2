import { lerSessao, limparSessao } from './armazenamentoDaSessao.js'

const URL_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3300/event_planning'

// no login, 401 é senha errada: a tela mostra o erro em vez de encerrar a sessão
const CAMINHO_DO_LOGIN = '/auth/login'

async function requisitar(caminho, opcoes = {}) {
  const resposta = await enviar(caminho, opcoes)

  if (!resposta.ok) {
    if (resposta.status === 401 && caminho !== CAMINHO_DO_LOGIN) {
      encerrarSessaoVencida()
    }
    throw await criarErroDaApi(resposta)
  }

  return resposta.json()
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
}
