// o navegador pode bloquear o sessionStorage (aba anônima, cookies desativados): por isso o try/catch
// e a cópia em memória, que mantém a pessoa logada até recarregar a página
const CHAVE = 'trocaticket.sessao'

let sessaoEmMemoria = null
const ouvintesDoFimDaSessao = new Set()

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
  ouvintesDoFimDaSessao.forEach((ouvinte) => ouvinte())
}

// avisa quem guarda dados da conta em memória, inclusive quando é a API que encerra a sessão vencida
export function aoLimparSessao(ouvinte) {
  ouvintesDoFimDaSessao.add(ouvinte)
}
