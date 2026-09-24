// Camada de infraestrutura: o único arquivo que conversa com a API.
//
// Toda chamada de rede do projeto passa por aqui, então a URL do backend
// fica escrita em um lugar só. Se ela mudar, mudamos apenas este arquivo.

const URL_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

async function requisitar(caminho, opcoes = {}) {
  const resposta = await fetch(`${URL_BASE}${caminho}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opcoes,
  })

  if (!resposta.ok) {
    throw new Error(`Erro ${resposta.status} ao chamar a API`)
  }

  return resposta.json()
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
