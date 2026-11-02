// Guarda a sessão (token e usuário) no sessionStorage: some quando a aba do navegador é fechada.
// O navegador pode bloquear o armazenamento (aba anônima, cookies desativados): por isso todo acesso
// fica em try/catch, e uma cópia em memória mantém a pessoa logada até ela recarregar a página.
const CHAVE = 'trocaticket.sessao'

let sessaoEmMemoria = null

// { token: 'eyJ...', usuario: { chave, nome, perfil } } ou null se ninguém entrou
export function lerSessao() {
  if (sessaoEmMemoria) return sessaoEmMemoria

  try {
    const sessao = JSON.parse(sessionStorage.getItem(CHAVE))
    sessaoEmMemoria = sessao?.token ? sessao : null
  } catch {
    sessaoEmMemoria = null
  }
  return sessaoEmMemoria
}

export function guardarSessao(sessao) {
  sessaoEmMemoria = sessao
  try {
    sessionStorage.setItem(CHAVE, JSON.stringify(sessao))
  } catch {
    // sem armazenamento: vale a cópia em memória
  }
}

export function limparSessao() {
  sessaoEmMemoria = null
  try {
    sessionStorage.removeItem(CHAVE)
  } catch {
    // nada guardado para limpar
  }
}
