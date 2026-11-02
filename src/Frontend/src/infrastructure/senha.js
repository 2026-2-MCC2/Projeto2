import { api } from './api.js'

// o backend responde igual exista ou não a conta, então a tela sempre mostra "verifique seu e-mail"
export function pedirRedefinicaoDeSenha(email) {
  return api.post('/auth/esqueci-senha', { email })
}

export function redefinirSenha({ token, senha }) {
  return api.post('/auth/redefinir-senha', { token, password: senha })
}
