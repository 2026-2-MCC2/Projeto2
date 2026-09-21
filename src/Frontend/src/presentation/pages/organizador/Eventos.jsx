import { useState } from 'react'
import { OrganizadorLayout } from '../../components/organizador/OrganizadorLayout.jsx'
import { useIsMobile } from '../../hooks/useIsMobile.js'
import iconeBuscar from '../../assets/organizador/icone-buscar.svg'
import iconeAdicionar from '../../assets/organizador/icone-adicionar.svg'

const FILTROS = [
  { id: 'todos', nome: 'Todos', nomeCurto: 'Todos' },
  { id: 'planejamento', nome: 'Em planejamento', nomeCurto: 'Planejamento' },
  { id: 'cotacao', nome: 'Em cotação', nomeCurto: 'Cotação' },
  { id: 'aprovado', nome: 'Aprovado', nomeCurto: 'Aprovado' },
]

export function Eventos() {
  const isMobile = useIsMobile()
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState('todos')

  return (
    <OrganizadorLayout titulo="Meus eventos">
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
        <button type="button" className="novo-evento">
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
      </div>
    </OrganizadorLayout>
  )
}
