import { api } from './api.js'

// máximo aceito pelo backend
const LIMITE_POR_PAGINA = 100

const STATUS_DA_API = { approved: 'ativo', blocked: 'bloqueado' }

function paraUsuario(usuario) {
  return {
    chave: usuario.user_key,
    nome: usuario.name,
    perfil: usuario.profile,
    email: usuario.email,
    responsavel: usuario.responsible_name,
    cidade: usuario.city && usuario.state ? `${usuario.city}, ${usuario.state}` : usuario.city,
    status: STATUS_DA_API[usuario.status],
  }
}

async function listarPorStatus(status) {
  const resposta = await api.get(`/admin/users?status=${status}&limit=${LIMITE_POR_PAGINA}&page=0`)
  return { usuarios: resposta.data.map(paraUsuario), temMais: !resposta.is_last_page }
}

// a tela mostra quem já tem acesso: os ativos e os bloqueados
export async function listarUsuariosComAcesso() {
  const [ativos, bloqueados] = await Promise.all([
    listarPorStatus('approved'),
    listarPorStatus('blocked'),
  ])
  return {
    usuarios: [...ativos.usuarios, ...bloqueados.usuarios],
    temMais: ativos.temMais || bloqueados.temMais,
  }
}

const caminhoDoUsuario = (chave) => `/admin/users/${encodeURIComponent(chave)}`

export function bloquearUsuario(chave, motivo) {
  return api.put(`${caminhoDoUsuario(chave)}/status`, { status: 'blocked', reason: motivo })
}

export function reativarUsuario(chave) {
  return api.put(`${caminhoDoUsuario(chave)}/status`, { status: 'approved' })
}

export function enviarRedefinicaoDeSenha(chave) {
  return api.post(`${caminhoDoUsuario(chave)}/redefinicao-de-senha`)
}
