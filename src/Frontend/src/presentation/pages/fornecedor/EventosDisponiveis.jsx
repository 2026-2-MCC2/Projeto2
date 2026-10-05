import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { OrganizadorLayout } from '../../components/organizador/OrganizadorLayout.jsx'
import { EVENTOS_DISPONIVEIS } from '../../data/eventosDisponiveis.js'
import { useIsMobile } from '../../hooks/useIsMobile.js'
import { Icone } from '../../components/comum/Icone.jsx'
import iconeBuscar from '../../assets/organizador/icone-buscar.svg'
import iconePrazo from '../../assets/fornecedor/icone-prazo.svg'
import '../../styles/fornecedor.css'

const FILTROS = ['Minhas categorias', 'Alimentação', 'Bebidas']

function CartaoEvento({ evento }) {
  return (
    <article className="fornecedor-evento">
      <div className="fornecedor-evento__identificacao">
        <div className="fornecedor-evento__etiquetas">
          <span className="fornecedor-evento__categorias">{evento.categorias.join(' · ')}</span>
          <span className="fornecedor-evento__prazo">
            <Icone src={iconePrazo} />
            {evento.prazo}
          </span>
        </div>
        <h2>{evento.nome}</h2>
        <p>
          {evento.data}
          <span aria-hidden="true"> · </span>
          {evento.local}
        </p>
      </div>

      <div className="fornecedor-evento__numeros" aria-label="Dados do evento">
        <div>
          <span>Público</span>
          <strong>{evento.publico}</strong>
        </div>
        <div>
          <span>Itens abertos</span>
          <strong>{evento.itensAbertos}</strong>
        </div>
        <div>
          <span>Orçamento previsto</span>
          <strong className="fornecedor-evento__orcamento">{evento.orcamento}</strong>
        </div>
      </div>

      <Link
        className="fornecedor-evento__acao"
        to={`/fornecedor/eventos/${evento.id}/propostas/etapa-1`}
      >
        Ver itens e enviar proposta
      </Link>
    </article>
  )
}

export function EventosDisponiveis() {
  const isMobile = useIsMobile()
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState(FILTROS[0])
  const eventos = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR')
    return EVENTOS_DISPONIVEIS.filter((evento) => {
      const correspondeCategoria = filtro === FILTROS[0] || evento.categorias.includes(filtro)
      const texto = `${evento.nome} ${evento.local} ${evento.organizador}`.toLocaleLowerCase(
        'pt-BR',
      )
      return correspondeCategoria && texto.includes(termo)
    })
  }, [busca, filtro])

  return (
    <OrganizadorLayout
      perfil="fornecedor"
      titulo="Eventos disponíveis"
      apoio={`${eventos.length} ${eventos.length === 1 ? 'evento com itens abertos' : 'eventos com itens abertos'} nas suas categorias de atuação.`}
      apoioMobile="Oportunidades nas suas categorias"
    >
      <>
        <section className="fornecedor__busca-filtros" aria-label="Buscar e filtrar eventos">
          <label className="fornecedor__busca">
            <Icone src={iconeBuscar} />
            <input
              type="search"
              placeholder={
                isMobile ? 'Buscar evento ou local' : 'Buscar evento por nome, local ou organizador'
              }
              value={busca}
              onChange={(evento) => setBusca(evento.target.value)}
            />
          </label>
          <div className="fornecedor__filtros" aria-label="Filtrar por categoria">
            {FILTROS.map((opcao) => (
              <button
                key={opcao}
                className={`filtro${filtro === opcao ? ' filtro--ativo' : ''}`}
                type="button"
                aria-pressed={filtro === opcao}
                onClick={() => setFiltro(opcao)}
              >
                {opcao}
              </button>
            ))}
          </div>
        </section>

        {eventos.length ? (
          <section className="fornecedor__grade" aria-label="Eventos disponíveis">
            {eventos.map((evento) => (
              <CartaoEvento key={evento.id} evento={evento} />
            ))}
          </section>
        ) : (
          <p className="fornecedor__vazio" role="status">
            Nenhum evento encontrado para essa busca e categoria.
          </p>
        )}
      </>
    </OrganizadorLayout>
  )
}
