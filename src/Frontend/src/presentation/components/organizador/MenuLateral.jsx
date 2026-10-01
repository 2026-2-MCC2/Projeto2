import { NavLink } from 'react-router-dom'
import { EVENTOS } from '../../data/eventos.js'
import simbolo from '../../assets/organizador/simbolo.png'
import iconeOrganizador from '../../assets/organizador/icone-organizador.svg'
import iconeSair from '../../assets/organizador/icone-sair.svg'
import iconeFornecedor from '../../assets/fornecedor/icone-fornecedor.svg'
import iconeAdministracao from '../../assets/admin/icone-administracao.svg'

const PERFIS = {
  organizador: {
    area: 'ORGANIZADOR',
    icone: iconeOrganizador,
    nome: 'Lucas Santos',
    papel: 'Organizador',
  },
  fornecedor: {
    area: 'FORNECEDOR',
    icone: iconeFornecedor,
    nome: 'Sabor & Arte',
    papel: 'Fornecedor aprovado',
  },
  admin: {
    area: 'ADMINISTRAÇÃO',
    icone: iconeAdministracao,
    nome: 'Admin TrocaTicket',
    papel: 'Administrador',
  },
}

// O organizador monta o menu com os eventos recentes; os outros perfis têm uma lista fixa.
const ITENS = {
  fornecedor: [
    { rota: '/fornecedor/eventos', nome: 'Eventos disponíveis' },
    { rota: '/fornecedor/propostas', nome: 'Minhas propostas' },
    { rota: '/fornecedor/configuracoes', nome: 'Configurações' },
  ],
  admin: [
    { rota: '/admin/aprovacoes', nome: 'Aprovações' },
    { rota: '/admin/usuarios', nome: 'Usuários' },
    { rota: '/admin/historico', nome: 'Histórico' },
    { rota: '/admin/visao-geral', nome: 'Visão geral' },
    { rota: '/admin/configuracoes', nome: 'Configurações' },
  ],
}

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
  const itens = ITENS[perfil]

  return (
    <nav className="menu">
      <div className="menu__marca">
        <img src={simbolo} alt="" className="menu__simbolo" />
        <div>
          <p className="menu__nome">
            TrocaTicket <span>· Gestão</span>
          </p>
          <p className="menu__area">
            <img src={dadosPerfil.icone} alt="" />
            {dadosPerfil.area}
          </p>
        </div>
      </div>

      {itens ? (
        itens.map((item) => (
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
                className={({ isActive }) =>
                  `menu__evento${isActive ? ' menu__evento--ativo' : ''}`
                }
              >
                <span className={`menu__evento-marcador menu__evento-marcador--${evento.status}`} />
                <span className="menu__evento-texto">
                  <strong>{evento.nome}</strong>
                  <small>{evento.periodoCurto}</small>
                </span>
              </NavLink>
            ))}
          </div>

          <ItemMenu to="/organizador/configuracoes">Configurações</ItemMenu>
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
