// Toda chamada de rede passa por aqui, para a URL do backend ficar em um lugar só.
import { lerSessao, limparSessao } from './armazenamentoDaSessao.js'

const URL_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3300/event_planning'

// No login, 401 é "e-mail ou senha incorretos": a tela mostra o erro em vez de sair da sessão.
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

// Toda chamada leva o token do login, se houver. As rotas públicas (login, cadastro) o ignoram.
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
    // o fetch só falha assim quando a requisição nem chega ao backend (fora do ar ou sem internet)
    const erro = new Error('Não foi possível conectar ao servidor. Tente novamente em instantes.')
    erro.status = null
    erro.codigo = null
    throw erro
  }
}

// Token vencido ou inválido: limpa a sessão e volta para o login. O recarregamento completo
// também descarta qualquer dado da área logada que estivesse na tela.
function encerrarSessaoVencida() {
  limparSessao()
  if (window.location.pathname !== '/') {
    window.location.assign('/')
  }
}

// O backend devolve os erros como { title, description, translation, code }.
// A translation já vem em português, pronta para mostrar ao usuário.
async function criarErroDaApi(resposta) {
  const corpo = await lerCorpoDoErro(resposta)

  const erro = new Error(corpo?.translation ?? `Erro ${resposta.status} ao chamar a API`)
  erro.status = resposta.status
  erro.codigo = corpo?.code ?? null
  return erro
}

// Nem toda resposta de erro tem JSON (ex.: proxy fora do ar devolvendo HTML).
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
