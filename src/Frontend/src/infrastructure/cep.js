export async function buscarEnderecoPorCep(cep) {
  if (!cep) return null
  const digitos = String(cep).replace(/\D/g, '')
  if (digitos.length !== 8) return null

  try {
    const resposta = await fetch(`https://viacep.com.br/ws/${digitos}/json/`)
    if (!resposta.ok) return null
    const dados = await resposta.json()
    if (dados.erro) return null

    return {
      logradouro: dados.logradouro || '',
      bairro: dados.bairro || '',
      cidade: dados.localidade || '',
      estado: (dados.uf || '').toUpperCase(),
      enderecoCompleto: [dados.logradouro, dados.bairro].filter(Boolean).join(' — '),
    }
  } catch {
    return null
  }
}
