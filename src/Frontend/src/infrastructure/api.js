// Toda chamada de rede passa por aqui, para a URL do backend ficar em um lugar só.
const URL_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3300/event_planning'

async function requisitar(caminho, opcoes = {}) {
  const resposta = await fetch(`${URL_BASE}${caminho}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opcoes,
  })

  if (!resposta.ok) {
    throw await criarErroDaApi(resposta)
  }

  return resposta.json()
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
}
