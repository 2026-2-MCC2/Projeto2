import { Navigate, Outlet } from 'react-router-dom'
import { rotaInicialDoPerfil, usuarioAtual } from '../../application/sessao.js'

// Protege as rotas da área de um perfil (ver AppRoutes.jsx):
//   sem login        volta para o login ("/")
//   perfil errado    vai para a área do próprio perfil (ex.: fornecedor abrindo /admin)
// O backend também confere o perfil em cada rota; isto só evita mostrar telas que não são da pessoa.
export function AreaDoPerfil({ perfil }) {
  const usuario = usuarioAtual()

  if (!usuario) {
    return <Navigate to="/" replace />
  }
  if (usuario.perfil !== perfil) {
    return <Navigate to={rotaInicialDoPerfil(usuario.perfil)} replace />
  }
  return <Outlet />
}
