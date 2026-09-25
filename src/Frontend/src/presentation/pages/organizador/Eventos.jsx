import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { OrganizadorLayout } from '../../components/organizador/OrganizadorLayout.jsx'
import { CartaoEvento } from '../../components/organizador/CartaoEvento.jsx'
import { useIsMobile } from '../../hooks/useIsMobile.js'
import { EVENTOS, STATUS } from '../../data/eventos.js'
import iconeBuscar from '../../assets/organizador/icone-buscar.svg'
import iconeAdicionar from '../../assets/organizador/icone-adicionar.svg'

const FILTROS = [
  { id: 'todos', nome: 'Todos', nomeCurto: 'Todos' },
  ...Object.entries(STATUS).map(([id, status]) => ({ id, ...status })),
]

export function Eventos() {
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState('todos')

  const termo = busca.trim().toLowerCase()
  const eventos = EVENTOS.filter((evento) => {
    const combinaStatus = filtro === 'todos' || evento.status === filtro
    const combinaBusca = `${evento.nome} ${evento.local}`.toLowerCase().includes(termo)
    return combinaStatus && combinaBusca
  })

  const cardNovoEvento = (
    <button
      type="button"
      className="novo-evento"
      onClick={() => navigate('/organizador/eventos/novo')}
    >
      <span className="novo-evento__marcador">
        <img src={iconeAdicionar} alt="" />
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
    <OrganizadorLayout titulo="Meus eventos" apoio="3 eventos em planejamento">
      <div className="barra">
        <label className="barra__busca">
          <img src={iconeBuscar} alt="" />
          <input
            type="search"
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
              className={`filtro${filtro === opcao.id ? ' filtro--ativo' : ''}`}
              onClick={() => setFiltro(opcao.id)}
            >
              {isMobile ? opcao.nomeCurto : opcao.nome}
            </button>
          ))}
        </div>
      </div>

      <div className="organizador__grade">
        {isMobile && cardNovoEvento}

        {eventos.map((evento) => (
          <CartaoEvento key={evento.id} evento={evento} />
        ))}

        {!isMobile && cardNovoEvento}
      </div>
    </OrganizadorLayout>
  )
}
