import { Navigate, Outlet } from 'react-router-dom'
import { rotaInicialDoPerfil, usuarioAtual, ROTA_DO_LOGIN } from '../../application/sessao.js'
import { TempoRealProvider } from '../components/comum/TempoRealProvider.jsx'
import { useAvisoDeNotificacoes } from '../hooks/useAvisoDeNotificacoes.js'

// o backend também confere o perfil; isto só evita mostrar telas que não são da pessoa
export function AreaDoPerfil({ perfil }) {
  const usuario = usuarioAtual()

  if (!usuario) {
    return <Navigate to={ROTA_DO_LOGIN} replace />
  }
  if (usuario.perfil !== perfil) {
    return <Navigate to={rotaInicialDoPerfil(usuario.perfil)} replace />
  }
  // a chave do usuário recria a conexão se outra pessoa entrar na mesma aba
  return (
    <TempoRealProvider key={usuario.chave} comMensagens={perfil !== 'admin'}>
      <AvisoDeNotificacoes />
      <Outlet />
    </TempoRealProvider>
  )
}

// toasts das notificações que chegam: fica montado enquanto a pessoa navega pela área
function AvisoDeNotificacoes() {
  useAvisoDeNotificacoes()
  return null
}
