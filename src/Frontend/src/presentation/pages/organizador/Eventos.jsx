import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { OrganizadorLayout } from '../../components/organizador/OrganizadorLayout.jsx'
import { CartaoEvento, CartaoEventoSkeleton } from '../../components/organizador/CartaoEvento.jsx'
import { useIsMobile } from '../../hooks/useIsMobile.js'
import { listarTodosOsEventos, STATUS_FRONTEND } from '../../../application/eventos.js'
import { Icone } from '../../components/comum/Icone.jsx'
import { toast } from '../../toasts.js'
import iconeBuscar from '../../assets/organizador/icone-buscar.svg'
import iconeAdicionar from '../../assets/organizador/icone-adicionar.svg'

const FILTROS = [
  { id: 'todos', nome: 'Todos', nomeCurto: 'Todos' },
  ...Object.entries(STATUS_FRONTEND).map(([id, status]) => ({ id, ...status })),
]

export function Eventos() {
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState('todos')
  const [listaEventos, setListaEventos] = useState([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let ativo = true
    async function carregar() {
      setCarregando(true)
      try {
        const eventos = await listarTodosOsEventos()
        if (ativo) setListaEventos(eventos)
      } catch (falha) {
        if (ativo) toast.erro('Não foi possível carregar os eventos', { descricao: falha.message })
      } finally {
        if (ativo) setCarregando(false)
      }
    }
    carregar()
    return () => {
      ativo = false
    }
  }, [])

  const emPlanejamento = listaEventos.filter((evento) => evento.status === 'planejamento').length
  const resumoDoPlanejamento = carregando
    ? 'Carregando eventos...'
    : `${emPlanejamento} ${emPlanejamento === 1 ? 'evento' : 'eventos'} em planejamento`

  const termo = busca.trim().toLowerCase()
  const eventos = listaEventos.filter((evento) => {
    const combinaStatus = filtro === 'todos' || evento.status === filtro
    const combinaBusca = `${evento.nome} ${evento.local} ${evento.cidade} ${evento.motivoDoCancelamento ?? ''}`
      .toLowerCase()
      .includes(termo)
    return combinaStatus && combinaBusca
  })

  const cardNovoEvento = (
    <button
      type="button"
      className="novo-evento"
      onClick={() => navigate('/organizador/eventos/novo', { viewTransition: true })}
    >
      <span className="novo-evento__marcador">
        <Icone src={iconeAdicionar} />
      </span>
      <strong>Novo evento</strong>
      <span className="novo-evento__apoio">
        {isMobile
          ? 'Cadastre período, local e público'
          : 'Comece pelo período, local e público. O restante você completa depois.'}
      </span>
    </button>
  )

  return (
    <OrganizadorLayout titulo="Meus eventos" apoio={resumoDoPlanejamento}>
      <div className="barra">
        <label className="barra__busca">
          <Icone src={iconeBuscar} />
          <input
            type="search"
            aria-label="Buscar evento"
            placeholder={isMobile ? 'Buscar evento' : 'Buscar evento por nome ou local'}
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
          />
        </label>

        <div className="barra__filtros">
          {FILTROS.map((opcao) => (
            <button
              key={opcao.id}
              type="button"
              aria-pressed={filtro === opcao.id}
              className={`filtro${filtro === opcao.id ? ' filtro--ativo' : ''}`}
              onClick={() => setFiltro(opcao.id)}
            >
              {isMobile ? opcao.nomeCurto : opcao.nome}
            </button>
          ))}
        </div>
      </div>

      <div className="organizador__grade" aria-busy={carregando}>
        {carregando ? (
          <>
            <CartaoEventoSkeleton />
            <CartaoEventoSkeleton />
            <CartaoEventoSkeleton />
          </>
        ) : (
          eventos.map((evento) => (
            <CartaoEvento key={evento.id} evento={evento} />
          ))
        )}

        {cardNovoEvento}
      </div>
    </OrganizadorLayout>
  )
}
