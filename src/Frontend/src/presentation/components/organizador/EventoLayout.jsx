import { Link, NavLink, useParams } from 'react-router-dom'
import { OrganizadorLayout } from './OrganizadorLayout.jsx'
import { useIsMobile } from '../../hooks/useIsMobile.js'
import { STATUS } from '../../data/eventos.js'
import { STATUS_FRONTEND } from '../../../application/eventos.js'
import { useEvento } from '../../hooks/useEvento.js'
import { Icone } from '../comum/Icone.jsx'
import { TituloDaPagina } from '../comum/TituloDaPagina.jsx'
import { Carregando, ErroNaTela, Vazio } from '../comum/EstadoDaTela.jsx'
import iconeVoltar from '../../assets/organizador/icone-voltar.svg'

const ABAS = [
  { fim: '', nome: 'Visão geral', nomeCurto: 'Visão geral' },
  { fim: 'itens', nome: 'Itens de custo', nomeCurto: 'Custos' },
  { fim: 'propostas', nome: 'Propostas', nomeCurto: 'Propostas' },
  { fim: 'ticket', nome: 'Cálculo do ticket', nomeCurto: 'Ticket' },
]

export function EventoLayout({ acoes, comResumo = false, voltar, children }) {
  const { id } = useParams()
  const isMobile = useIsMobile()
  const { evento, carregando, erro, tentarDeNovo } = useEvento(id)

  if (carregando) {
    return (
      <OrganizadorLayout titulo="Carregando evento..." voltarPara="/organizador/eventos">
        <Carregando mensagem="Carregando informações do evento…" />
      </OrganizadorLayout>
    )
  }

  if (erro && erro.status !== 404) {
    return (
      <OrganizadorLayout titulo="Evento" voltarPara="/organizador/eventos">
        <ErroNaTela erro={erro} aoTentarDeNovo={tentarDeNovo} />
      </OrganizadorLayout>
    )
  }

  if (!evento) {
    return (
      <OrganizadorLayout titulo="Evento não encontrado" voltarPara="/organizador/eventos">
        <Vazio titulo="Este evento não existe" mensagem="Confira o endereço ou volte para a lista.">
          <Link to="/organizador/eventos" className="botao botao--secundario">
            Ver meus eventos
          </Link>
        </Vazio>
      </OrganizadorLayout>
    )
  }

  const mapaStatus = STATUS_FRONTEND[evento.status] ||
    STATUS[evento.status] || { nome: evento.status }
  const detalhe = evento.detalhe
  const etiqueta = <span className={`etiqueta etiqueta--${evento.status}`}>{mapaStatus.nome}</span>

  const destinoDoVoltar = voltar?.para ?? '/organizador/eventos'
  const nomeDoVoltar = voltar?.nome ?? 'Meus eventos'

  const abas = (
    <div className="evento-abas">
      {ABAS.map((aba) => (
        <NavLink
          key={aba.nome}
          end={aba.fim === ''}
          to={`/organizador/eventos/${evento.id}${aba.fim ? `/${aba.fim}` : ''}`}
          viewTransition
          className={({ isActive }) => `evento-aba${isActive ? ' evento-aba--ativa' : ''}`}
        >
          {isMobile ? aba.nomeCurto : aba.nome}
        </NavLink>
      ))}
    </div>
  )

  if (isMobile) {
    return (
      <OrganizadorLayout
        titulo={evento.nome}
        apoio={detalhe?.resumoMobile}
        subCabecalho={abas}
        voltarPara={destinoDoVoltar}
      >
        {children}
      </OrganizadorLayout>
    )
  }

  return (
    <OrganizadorLayout>
      <TituloDaPagina titulo={detalhe?.nomeCompleto ?? evento.nome} />
      <div className="evento-topo">
        <div
          className={`evento-topo__titulos${comResumo ? '' : ' evento-topo__titulos--espacado'}`}
        >
          <Link to={destinoDoVoltar} className="evento-topo__voltar" viewTransition>
            <Icone src={iconeVoltar} />
            {nomeDoVoltar}
          </Link>

          <div className="evento-topo__nome">
            <h1>{detalhe?.nomeCompleto ?? evento.nome}</h1>
            {etiqueta}

            {!comResumo && acoes && <div className="evento-topo__acoes">{acoes}</div>}
          </div>

          {comResumo && detalhe && <p className="evento-topo__resumo">{detalhe.resumo}</p>}
        </div>

        {comResumo && acoes && <div className="evento-topo__acoes">{acoes}</div>}
      </div>

      {abas}

      {children}
    </OrganizadorLayout>
  )
}
