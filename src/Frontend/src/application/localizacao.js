import { buscarEnderecoPorCep } from '../infrastructure/cep.js'

export async function consultarCep(cep) {
  return await buscarEnderecoPorCep(cep)
}
