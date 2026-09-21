import { Link, NavLink } from 'react-router-dom'
import simbolo from '../../assets/organizador/simbolo.png'
import iconeOrganizador from '../../assets/organizador/icone-organizador.svg'
import iconeSair from '../../assets/organizador/icone-sair.svg'

export function MenuLateral() {
  return (
    <nav className="menu">
      <div className="menu__marca">
        <img src={simbolo} alt="" className="menu__simbolo" />
        <div>
          <p className="menu__nome">
            TrocaTicket <span>· Gestão</span>
          </p>
          <p className="menu__area">
            <img src={iconeOrganizador} alt="" />
            ORGANIZADOR
          </p>
        </div>
      </div>

      <NavLink
        to="/organizador/eventos"
        className={({ isActive }) => `menu__item${isActive ? ' menu__item--ativo' : ''}`}
      >
        Todos os eventos
      </NavLink>

      <NavLink
        to="/organizador/configuracoes"
        className={({ isActive }) => `menu__item${isActive ? ' menu__item--ativo' : ''}`}
      >
        Configurações
      </NavLink>

      <div className="menu__usuario">
        <div>
          <p className="menu__usuario-nome">Chico Trento</p>
          <p className="menu__usuario-papel">Organizador</p>
        </div>
        <Link to="/" className="menu__sair" aria-label="Sair">
          <img src={iconeSair} alt="" />
        </Link>
      </div>
    </nav>
  )
}
