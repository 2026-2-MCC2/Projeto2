import { Link, NavLink } from 'react-router-dom'
import simbolo from '../../assets/organizador/simbolo.png'
import iconeOrganizador from '../../assets/organizador/icone-organizador.svg'
import iconeSair from '../../assets/organizador/icone-sair.svg'

const ITENS = [
  { rota: '/organizador/eventos', nome: 'Todos os eventos' },
  { rota: '/organizador/configuracoes', nome: 'Configurações' },
]

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

      {ITENS.map((item) => (
        <NavLink
          key={item.rota}
          to={item.rota}
          className={({ isActive }) => `menu__item${isActive ? ' menu__item--ativo' : ''}`}
        >
          {item.nome}
        </NavLink>
      ))}

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
