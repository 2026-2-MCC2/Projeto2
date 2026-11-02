import { buscarEnderecoPorCep } from '../infrastructure/cep.js'

/**
 * Consulta endereço completo a partir do CEP via camada de infraestrutura.
 * @param {string} cep
 * @returns {Promise<{ logradouro: string, bairro: string, cidade: string, estado: string, enderecoCompleto: string } | null>}
 */
export async function consultarCep(cep) {
  return await buscarEnderecoPorCep(cep)
}
