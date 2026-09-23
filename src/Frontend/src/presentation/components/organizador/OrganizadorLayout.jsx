import { Link, NavLink } from 'react-router-dom'
import { useIsMobile } from '../../hooks/useIsMobile.js'
import { MenuLateral } from './MenuLateral.jsx'
import simbolo from '../../assets/organizador/simbolo.png'
import iconeSair from '../../assets/organizador/icone-sair.svg'
import iconeVoltar from '../../assets/organizador/icone-voltar.svg'
import iconeAcessibilidade from '../../assets/organizador/icone-acessibilidade.svg'
import iconeEventos from '../../assets/organizador/icone-eventos.svg'
import iconeAjustes from '../../assets/organizador/icone-ajustes.svg'
import '../../styles/organizador.css'

const ABAS = [
  { rota: '/organizador/eventos', nome: 'Eventos', icone: iconeEventos },
  { rota: '/organizador/configuracoes', nome: 'Ajustes', icone: iconeAjustes },
]

// No mobile o menu lateral vira barra superior e abas embaixo; com `aoVoltar` a tela entra em modo de fluxo.
export function OrganizadorLayout({ titulo, apoio, estreito = false, aoVoltar, rodape, subCabecalho, children }) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <div className={`organizador${aoVoltar ? ' organizador--fluxo' : ''}`}>
        <header className="topo">
          {aoVoltar ? (
            <div className="topo__fluxo">
              <button type="button" className="topo__voltar" aria-label="Voltar" onClick={aoVoltar}>
                <img src={iconeVoltar} alt="" />
              </button>
              <h1>{titulo}</h1>
              <img src={simbolo} alt="" className="topo__fluxo-marca" />
              <button type="button" className="topo__acessibilidade" aria-label="Acessibilidade">
                <img src={iconeAcessibilidade} alt="" />
              </button>
            </div>
          ) : null}
          {aoVoltar ? (
            subCabecalho
          ) : (
            <>
              <div className="topo__marca">
                <img src={simbolo} alt="" />
                <p>
                  TrocaTicket <span>· Gestão</span>
                </p>
              </div>

              <div className="topo__cabecalho">
                <div>
                  <h1>{titulo}</h1>
                  {apoio && <p>{apoio}</p>}
                </div>
                <Link to="/" className="topo__sair" aria-label="Sair">
                  <img src={iconeSair} alt="" />
                </Link>
              </div>
            </>
          )}
        </header>

        <main className="organizador__conteudo">{children}</main>

        {aoVoltar ? (
          rodape && <div className="rodape-fluxo">{rodape}</div>
        ) : (
          <nav className="abas">
            {ABAS.map((aba) => (
              <NavLink
                key={aba.rota}
                to={aba.rota}
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
      </div>
    )
  }

  return (
    <div className="organizador">
      <MenuLateral />

      <main className="organizador__conteudo">
        <div className={`organizador__area${estreito ? ' organizador__area--estreita' : ''}`}>
          <header className="organizador__cabecalho">
            <h1>{titulo}</h1>
            {apoio && <p>{apoio}</p>}
          </header>

          {children}
        </div>
      </main>
    </div>
  )
}
