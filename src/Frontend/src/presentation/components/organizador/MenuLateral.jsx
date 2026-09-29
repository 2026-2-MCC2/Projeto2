import { NavLink } from 'react-router-dom'
import { EVENTOS } from '../../data/eventos.js'
import simbolo from '../../assets/organizador/simbolo.png'
import iconeOrganizador from '../../assets/organizador/icone-organizador.svg'
import iconeSair from '../../assets/organizador/icone-sair.svg'
import iconeFornecedor from '../../assets/fornecedor/icone-fornecedor.svg'

const PERFIS = {
  organizador: { area: 'ORGANIZADOR', nome: 'Lucas Santos', papel: 'Organizador' },
  fornecedor: { area: 'FORNECEDOR', nome: 'Sabor & Arte', papel: 'Fornecedor aprovado' },
}

const ITENS_FORNECEDOR = [
  { rota: '/fornecedor/eventos', nome: 'Eventos disponíveis', exata: true },
  { rota: '/fornecedor/propostas', nome: 'Minhas propostas' },
  { rota: '/fornecedor/configuracoes', nome: 'Configurações' },
]

function ItemMenu({ to, end = false, children }) {
  return (
    <NavLink
      to={to}
      end={end}
      viewTransition
      className={({ isActive }) => `menu__item${isActive ? ' menu__item--ativo' : ''}`}
    >
      {children}
    </NavLink>
  )
}

export function MenuLateral({ aoSair, perfil = 'organizador' }) {
  const dadosPerfil = PERFIS[perfil] ?? PERFIS.organizador
  const fornecedor = perfil === 'fornecedor'

  return (
    <nav className="menu">
      <div className="menu__marca">
        <img src={simbolo} alt="" className="menu__simbolo" />
        <div>
          <p className="menu__nome">
            TrocaTicket <span>· Gestão</span>
          </p>
          <p className="menu__area">
            <img src={fornecedor ? iconeFornecedor : iconeOrganizador} alt="" />
            {dadosPerfil.area}
          </p>
        </div>
      </div>

      {fornecedor ? (
        ITENS_FORNECEDOR.map((item) => (
          <ItemMenu key={item.rota} to={item.rota} end={item.exata}>
            {item.nome}
          </ItemMenu>
        ))
      ) : (
        <>
          <ItemMenu to="/organizador/eventos" end>
            Todos os eventos
          </ItemMenu>

          <div className="menu__recentes">
            <p className="menu__secao">RECENTES</p>

            {EVENTOS.map((evento) => (
              <NavLink
                key={evento.id}
                to={`/organizador/eventos/${evento.id}`}
                viewTransition
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

          <ItemMenu to="/organizador/configuracoes">
            Configurações
          </ItemMenu>
        </>
      )}

      <div className="menu__usuario">
        <div>
          <p className="menu__usuario-nome">{dadosPerfil.nome}</p>
          <p className="menu__usuario-papel">{dadosPerfil.papel}</p>
        </div>
        <button type="button" className="menu__sair" aria-label="Sair" onClick={aoSair}>
          <img src={iconeSair} alt="" />
        </button>
      </div>
    </nav>
  )
}
