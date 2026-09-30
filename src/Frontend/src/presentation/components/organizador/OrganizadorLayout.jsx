import { useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useIsMobile } from '../../hooks/useIsMobile.js'
import { MenuLateral } from './MenuLateral.jsx'
import { BotaoAcessibilidade } from '../comum/BotaoAcessibilidade.jsx'
import { BotaoTema } from '../comum/BotaoTema.jsx'
import { ModalSair } from '../comum/ModalSair.jsx'
import simbolo from '../../assets/organizador/simbolo.png'
import iconeSair from '../../assets/organizador/icone-sair.svg'
import iconeVoltar from '../../assets/organizador/icone-voltar.svg'
import iconeEventos from '../../assets/organizador/icone-eventos.svg'
import iconeAjustes from '../../assets/organizador/icone-ajustes.svg'
import iconeLista from '../../assets/organizador/icone-lista.svg'
import iconeAprovacoes from '../../assets/admin/icone-aprovacoes.svg'
import iconeUsuarios from '../../assets/admin/icone-usuarios.svg'
import iconeHistorico from '../../assets/admin/icone-historico.svg'
import iconeVisaoGeral from '../../assets/admin/icone-visao-geral.svg'
import '../../styles/organizador.css'

const ABAS = {
  organizador: [
    { rota: '/organizador/eventos', nome: 'Eventos', icone: iconeEventos },
    { rota: '/organizador/configuracoes', nome: 'Ajustes', icone: iconeAjustes },
  ],
  fornecedor: [
    { rota: '/fornecedor/eventos', nome: 'Eventos', icone: iconeEventos },
    { rota: '/fornecedor/propostas', nome: 'Propostas', icone: iconeLista },
    { rota: '/fornecedor/configuracoes', nome: 'Ajustes', icone: iconeAjustes },
  ],
  admin: [
    { rota: '/admin/aprovacoes', nome: 'Aprovações', icone: iconeAprovacoes },
    { rota: '/admin/usuarios', nome: 'Usuários', icone: iconeUsuarios },
    { rota: '/admin/historico', nome: 'Histórico', icone: iconeHistorico },
    { rota: '/admin/visao-geral', nome: 'Visão geral', icone: iconeVisaoGeral },
    { rota: '/admin/configuracoes', nome: 'Ajustes', icone: iconeAjustes },
  ],
}

// No mobile o menu lateral vira barra superior e abas embaixo; com `aoVoltar` a tela entra em modo de fluxo.
// `acoes` fica ao lado do título só no desktop; no mobile a página decide onde colocá-las.
export function OrganizadorLayout({
  titulo,
  apoio,
  acoes,
  estreito = false,
  voltarPara,
  aoVoltar,
  rodape,
  subCabecalho,
  apoioMobile,
  perfil = 'organizador',
  children,
}) {
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const organizador = perfil === 'organizador'
  const naListaDeEventos = organizador && pathname === '/organizador/eventos'
  const abas = ABAS[perfil] ?? ABAS.organizador
  const classeDoPerfil = organizador ? '' : ` organizador--${perfil}`
  const [confirmandoSaida, setConfirmandoSaida] = useState(false)

  const modalDeSaida = confirmandoSaida && <ModalSair aoFechar={() => setConfirmandoSaida(false)} />

  if (isMobile) {
    return (
      <div className={`organizador${classeDoPerfil}${aoVoltar ? ' organizador--fluxo' : ''}`}>
        <header className="topo">
          {aoVoltar ? (
            <div className="topo__fluxo">
              <button type="button" className="topo__voltar" aria-label="Voltar" onClick={aoVoltar}>
                <img src={iconeVoltar} alt="" />
              </button>
              <h1>{titulo}</h1>
              <img src={simbolo} alt="" className="topo__fluxo-marca" />
              <BotaoTema />
              <BotaoAcessibilidade posicao="topo" />
            </div>
          ) : null}
          {aoVoltar ? (
            subCabecalho
          ) : (
            <>
              {!voltarPara && (
                <div className="topo__marca">
                  <img src={simbolo} alt="" />
                  <p>
                    TrocaTicket <span>· Gestão</span>
                  </p>
                </div>
              )}

              <div className="topo__cabecalho">
                {voltarPara && (
                  <button
                    type="button"
                    className="topo__voltar"
                    aria-label="Voltar"
                    onClick={() => navigate(voltarPara, { viewTransition: true })}
                  >
                    <img src={iconeVoltar} alt="" />
                  </button>
                )}

                <div className="topo__titulos">
                  <h1>{titulo}</h1>
                  {(apoioMobile || apoio) && <p>{apoioMobile || apoio}</p>}
                </div>
                <div className="topo__acoes">
                  <BotaoTema />
                  {!naListaDeEventos && <BotaoAcessibilidade posicao="topo" />}
                  <button
                    type="button"
                    className="topo__sair"
                    aria-label="Sair"
                    onClick={() => setConfirmandoSaida(true)}
                  >
                    <img src={iconeSair} alt="" />
                  </button>
                </div>
              </div>

              {subCabecalho}
            </>
          )}
        </header>

        <main className="organizador__conteudo">{children}</main>

        {aoVoltar ? (
          rodape && <div className="rodape-fluxo">{rodape}</div>
        ) : (
          <nav className="abas">
            {abas.map((aba) => (
              <NavLink
                key={aba.rota}
                to={aba.rota}
                viewTransition
                className={({ isActive }) => `aba${isActive ? ' aba--ativa' : ''}`}
              >
                <span className="aba__marcador">
                  <img src={aba.icone} alt="" />
                </span>
                {aba.nome}
              </NavLink>
            ))}
          </nav>
        )}

        {naListaDeEventos && <BotaoAcessibilidade />}

        {modalDeSaida}
      </div>
    )
  }

  return (
    <div className={`organizador${classeDoPerfil}`}>
      <MenuLateral perfil={perfil} aoSair={() => setConfirmandoSaida(true)} />

      <main className="organizador__conteudo">
        <div className={`organizador__area${estreito ? ' organizador__area--estreita' : ''}`}>
          {titulo && (
            <header
              className={`organizador__cabecalho${acoes ? ' organizador__cabecalho--com-acoes' : ''}`}
            >
              <div>
                <h1>{titulo}</h1>
                {apoio && <p>{apoio}</p>}
              </div>
              {acoes}
            </header>
          )}

          {children}
        </div>
      </main>

      <BotaoAcessibilidade />

      {modalDeSaida}
    </div>
  )
}
