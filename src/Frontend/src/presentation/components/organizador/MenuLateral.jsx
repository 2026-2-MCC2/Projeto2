import { NavLink } from 'react-router-dom'
import { EVENTOS } from '../../data/eventos.js'
import simbolo from '../../assets/organizador/simbolo.png'
import iconeOrganizador from '../../assets/organizador/icone-organizador.svg'
import iconeSair from '../../assets/organizador/icone-sair.svg'

export function MenuLateral({ aoSair }) {
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

      <NavLink to="/organizador/eventos" end className={({ isActive }) => `menu__item${isActive ? ' menu__item--ativo' : ''}`}>
        Todos os eventos
      </NavLink>

      <div className="menu__recentes">
        <p className="menu__secao">RECENTES</p>

        {EVENTOS.map((evento) => (
          <NavLink
            key={evento.id}
            to={`/organizador/eventos/${evento.id}`}
            className={({ isActive }) => `menu__evento${isActive ? ' menu__evento--ativo' : ''}`}
          >
            <span className={`menu__evento-marcador menu__evento-marcador--${evento.status}`} />
            <span className="menu__evento-texto">
              <strong>{evento.nome}</strong>
              <small>{evento.periodoCurto}</small>
            </span>
          </NavLink>
        ))}
      </div>

      <NavLink to="/organizador/configuracoes" className={({ isActive }) => `menu__item${isActive ? ' menu__item--ativo' : ''}`}>
        Configurações
      </NavLink>

      <div className="menu__usuario">
        <div>
          <p className="menu__usuario-nome">Lucas Santos</p>
          <p className="menu__usuario-papel">Organizador</p>
        </div>
        <button type="button" className="menu__sair" aria-label="Sair" onClick={aoSair}>
          <img src={iconeSair} alt="" />
        </button>
      </div>
    </nav>
  )
}
