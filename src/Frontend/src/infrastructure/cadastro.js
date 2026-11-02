// o backend recusa categories para organizador
import { api } from './api.js'

export function enviarCadastro({ perfil, nome, email, senha, cnpj, telefone, categorias }) {
  return api.post('/auth/cadastro', {
    profile: perfil,
    name: nome,
    email: email,
    password: senha,
    cnpj: cnpj,
    phone: telefone,
    ...(categorias !== undefined && { categories: categorias }),
  })
}
