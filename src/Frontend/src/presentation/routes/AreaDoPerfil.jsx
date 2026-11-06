import { Navigate, Outlet } from 'react-router-dom'
import { rotaInicialDoPerfil, usuarioAtual, ROTA_DO_LOGIN } from '../../application/sessao.js'

// o backend também confere o perfil; isto só evita mostrar telas que não são da pessoa
export function AreaDoPerfil({ perfil }) {
  const usuario = usuarioAtual()

  if (!usuario) {
    return <Navigate to={ROTA_DO_LOGIN} replace />
  }
  if (usuario.perfil !== perfil) {
    return <Navigate to={rotaInicialDoPerfil(usuario.perfil)} replace />
  }
  return <Outlet />
}
