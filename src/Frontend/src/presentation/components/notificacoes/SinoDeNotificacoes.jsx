import { Link } from 'react-router-dom'
import { useTempoReal } from '../../hooks/useTempoReal.jsx'
import { Icone } from '../comum/Icone.jsx'
import { ContadorDeNaoLidas } from './ContadorDeNaoLidas.jsx'
import iconeSino from '../../assets/comum/icone-sino.svg'
import '../../styles/notificacoes.css'

// barra superior do celular: leva à tela de notificações
export function SinoDeNotificacoes({ perfil }) {
  const { notificacoesNaoLidas } = useTempoReal()
  return (
    <Link to={`/${perfil}/notificacoes`} className="sino-notificacoes" viewTransition>
      <Icone src={iconeSino} />
      <span className="so-leitor">Notificações</span>
      <ContadorDeNaoLidas
        total={notificacoesNaoLidas}
        maximo={9}
        className="sino-notificacoes__contador"
      />
    </Link>
  )
}
