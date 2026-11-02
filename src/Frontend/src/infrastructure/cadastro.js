// Autocadastro no backend (POST /auth/cadastro).
// A tela usa nomes em português; aqui eles viram os nomes de campo que o backend espera.
import { api } from './api.js'

export function enviarCadastro({ perfil, nome, email, senha, cnpj, telefone }) {
  return api.post('/auth/cadastro', {
    profile: perfil,
    name: nome,
    email: email,
    password: senha,
    cnpj: cnpj,
    phone: telefone,
  })
}
