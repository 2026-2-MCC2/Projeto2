import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { listarEventosRecentes } from '../../../application/eventos.js'
import { buscarEventoEmMemoria, observarEventos } from '../../../application/eventosEmMemoria.js'
import { usuarioAtual } from '../../../application/sessao.js'
import { Icone } from '../comum/Icone.jsx'
import { NotificacoesDoMenu } from '../notificacoes/PainelDeNotificacoes.jsx'
import { ContadorDeNaoLidas } from '../notificacoes/ContadorDeNaoLidas.jsx'
import { useTempoReal } from '../../hooks/useTempoReal.jsx'
import simbolo from '../../assets/organizador/simbolo.png'
import iconeOrganizador from '../../assets/organizador/icone-organizador.svg'
import iconeEventos from '../../assets/organizador/icone-eventos.svg'
import iconeSair from '../../assets/organizador/icone-sair.svg'
import iconeDuvidas from '../../assets/comum/icone-duvidas.svg'
import iconeAjustes from '../../assets/organizador/icone-ajustes.svg'
import iconeFornecedor from '../../assets/fornecedor/icone-fornecedor.svg'
import iconeAdministracao from '../../assets/admin/icone-administracao.svg'
import iconePropostas from '../../assets/fornecedor/icone-propostas.svg'
import iconeChats from '../../assets/comum/icone-chats.svg'
import iconeAprovacoes from '../../assets/admin/icone-aprovacoes.svg'
import iconeUsuarios from '../../assets/admin/icone-usuarios.svg'
import iconeHistorico from '../../assets/admin/icone-historico.svg'
import iconeVisaoGeral from '../../assets/admin/icone-visao-geral.svg'

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

const ITENS = {
  fornecedor: [
    { rota: '/fornecedor/eventos', nome: 'Eventos disponíveis', icone: iconeEventos },
    { rota: '/fornecedor/propostas', nome: 'Minhas propostas', icone: iconePropostas },
    { rota: '/fornecedor/chats', nome: 'Chats', icone: iconeChats, comMensagens: true },
  ],
  admin: [
    { rota: '/admin/aprovacoes', nome: 'Aprovações', icone: iconeAprovacoes },
    { rota: '/admin/usuarios', nome: 'Usuários', icone: iconeUsuarios },
    { rota: '/admin/historico', nome: 'Histórico', icone: iconeHistorico },
    { rota: '/admin/visao-geral', nome: 'Visão geral', icone: iconeVisaoGeral },
  ],
}

function ItemMenu({ to, end = false, classe = '', children }) {
  return (
    <NavLink
      to={to}
      end={end}
      viewTransition
      className={({ isActive }) =>
        `menu__item${isActive ? ' menu__item--ativo' : ''}${classe ? ` ${classe}` : ''}`
      }
    >
      {children}
    </NavLink>
  )
}

export function MenuLateral({ aoSair, perfil = 'organizador' }) {
  const dadosPerfil = PERFIS[perfil] ?? PERFIS.organizador
  const itens = ITENS[perfil]
  const { mensagensNaoLidas } = useTempoReal()
  const usuario = usuarioAtual()
  const nomeExibicao = usuario?.nome || dadosPerfil.nome
  const [eventosRecentes, setEventosRecentes] = useState([])

  // refaz a lista quando algum evento muda (criado, editado, publicado ou cancelado)
  useEffect(() => {
    if (perfil !== 'organizador') return
    let ativo = true

    function atualizarRecentes() {
      // ao sair, a limpeza dos eventos também avisa o menu: sem sessão não há o que buscar
      if (!usuarioAtual()) return
      listarEventosRecentes(4)
        .then((eventos) => {
          if (ativo)
            setEventosRecentes(eventos.map((evento) => buscarEventoEmMemoria(evento.id) ?? evento))
        })
        .catch(() => {})
    }

    atualizarRecentes()
    const pararDeObservar = observarEventos(atualizarRecentes)
    return () => {
      ativo = false
      pararDeObservar()
    }
  }, [perfil])

  return (
    <nav className="menu">
      <div className="menu__marca">
        <img src={simbolo} alt="" className="menu__simbolo" />
        <div>
          <p className="menu__nome">
            TrocaTicket <span>· Gestão</span>
          </p>
          <p className="menu__area">
            <Icone src={dadosPerfil.icone} />
            {dadosPerfil.area}
          </p>
        </div>
        <NotificacoesDoMenu perfil={perfil} />
      </div>

      {itens ? (
        <>
          {itens.map((item) => (
            <ItemMenu key={item.rota} to={item.rota}>
              <Icone src={item.icone} />
              {item.nome}
              {item.comMensagens && (
                <ContadorDeNaoLidas
                  total={mensagensNaoLidas.total}
                  maximo={9}
                  className="menu__contador"
                />
              )}
            </ItemMenu>
          ))}
        </>
      ) : (
        <>
          <ItemMenu to="/organizador/eventos" end>
            <Icone src={iconeEventos} />
            Todos os eventos
          </ItemMenu>
          <ItemMenu to="/organizador/chats">
            <Icone src={iconeChats} />
            Chats
            <ContadorDeNaoLidas
              total={mensagensNaoLidas.total}
              maximo={9}
              className="menu__contador"
            />
          </ItemMenu>

          {eventosRecentes.length > 0 && (
            <div className="menu__recentes">
              <p className="menu__secao">RECENTES</p>

              {eventosRecentes.map((evento) => (
                <NavLink
                  key={evento.id}
                  to={`/organizador/eventos/${evento.id}`}
                  viewTransition
                  className={({ isActive }) =>
                    `menu__evento${isActive ? ' menu__evento--ativo' : ''}${evento.status === 'cancelado' ? ' menu__evento--cancelado' : ''}`
                  }
                >
                  <span
                    className={`menu__evento-marcador menu__evento-marcador--${evento.status}`}
                  />
                  <span className="menu__evento-texto">
                    <strong>{evento.nome}</strong>
                    <small>{evento.periodoCurto}</small>
                  </span>
                </NavLink>
              ))}
            </div>
          )}
        </>
      )}

      <div className="menu__rodape">
        <ItemMenu to={`/${perfil}/duvidas`} classe="menu__item--ajuda">
          <Icone src={iconeDuvidas} />
          Dúvidas
        </ItemMenu>

        <ItemMenu to={`/${perfil}/configuracoes`} classe="menu__item--ajuda">
          <Icone src={iconeAjustes} />
          Configurações
        </ItemMenu>

        <div className="menu__usuario">
          <div>
            <p className="menu__usuario-nome">{nomeExibicao}</p>
            <p className="menu__usuario-papel">{dadosPerfil.papel}</p>
          </div>
          <button type="button" className="menu__sair" aria-label="Sair" onClick={aoSair}>
            <Icone src={iconeSair} />
          </button>
        </div>
      </div>
    </nav>
  )
}
