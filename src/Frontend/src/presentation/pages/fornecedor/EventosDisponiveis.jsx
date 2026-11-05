import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listarEventosDisponiveis } from '../../../application/eventosDisponiveis.js'
import { formatarPeriodo } from '../../../application/eventos.js'
import { OrganizadorLayout } from '../../components/organizador/OrganizadorLayout.jsx'
import { Carregando, ErroNaTela, Vazio } from '../../components/comum/EstadoDaTela.jsx'
import { useIsMobile } from '../../hooks/useIsMobile.js'
import { Icone } from '../../components/comum/Icone.jsx'
import iconeBuscar from '../../assets/organizador/icone-buscar.svg'
import '../../styles/fornecedor.css'

const TAMANHO_DA_PAGINA = 100

function CartaoEvento({ evento }) {
  return (
    <article className="fornecedor-evento">
      <div className="fornecedor-evento__identificacao">
        <span className="fornecedor-evento__categorias">{evento.categories.join(' · ')}</span>
        <h2>{evento.name}</h2>
        <p>
          {formatarPeriodo(evento.start_date, evento.end_date)}
          <span aria-hidden="true"> · </span>
          {evento.venue_name} · {evento.city}, {evento.state}
        </p>
      </div>

      <div className="fornecedor-evento__numeros" aria-label="Dados do evento">
        <div>
          <span>Público esperado</span>
          <strong>{Number(evento.expected_audience).toLocaleString('pt-BR')}</strong>
        </div>
        <div>
          <span>Itens nas suas categorias</span>
          <strong>{evento.items_count}</strong>
        </div>
      </div>

      <Link className="fornecedor-evento__acao" to={`/fornecedor/eventos/${evento.event_key}`}>
        Ver itens do evento
      </Link>
    </article>
  )
}

export function EventosDisponiveis() {
  const isMobile = useIsMobile()
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState('Minhas categorias')
  const [tentativa, setTentativa] = useState(0)
  const [carregandoMais, setCarregandoMais] = useState(false)
  const [resultado, setResultado] = useState({ termo: null, data: [], erro: null })
  const termo = busca.trim()
  const carregando = resultado.termo !== termo
  const dados = carregando ? { data: [], total: 0, is_last_page: true } : resultado
  const categorias = [...new Set(dados.data.flatMap((evento) => evento.categories))].sort()
  const filtros = ['Minhas categorias', ...categorias]
  const eventos = dados.data.filter(
    (evento) => filtro === 'Minhas categorias' || evento.categories.includes(filtro),
  )

  useEffect(() => {
    let telaAberta = true
    listarEventosDisponiveis({ search: termo, limit: TAMANHO_DA_PAGINA, page: 0 })
      .then((resposta) => {
        if (telaAberta) setResultado({ ...resposta, termo, pagina: 0, erro: null })
      })
      .catch((erro) => {
        if (telaAberta) setResultado({ termo, data: [], total: 0, is_last_page: true, erro })
      })

    return () => {
      telaAberta = false
    }
  }, [termo, tentativa])

  async function carregarMais() {
    setCarregandoMais(true)
    try {
      const pagina = resultado.pagina + 1
      const resposta = await listarEventosDisponiveis({
        search: termo,
        limit: TAMANHO_DA_PAGINA,
        page: pagina,
      })
      setResultado((atual) =>
        atual.termo === termo
          ? { ...resposta, termo, pagina, data: [...atual.data, ...resposta.data], erro: null }
          : atual,
      )
    } catch (erro) {
      setResultado((atual) => (atual.termo === termo ? { ...atual, erro } : atual))
    } finally {
      setCarregandoMais(false)
    }
  }

  const tituloDeApoio = carregando
    ? 'Carregando eventos…'
    : `${dados.total} ${dados.total === 1 ? 'evento disponível' : 'eventos disponíveis'} nas suas categorias.`

  return (
    <OrganizadorLayout
      perfil="fornecedor"
      titulo="Eventos disponíveis"
      apoio={tituloDeApoio}
      apoioMobile="Oportunidades nas suas categorias"
    >
      <>
        <section className="fornecedor__busca-filtros" aria-label="Buscar e filtrar eventos">
          <label className="fornecedor__busca">
            <Icone src={iconeBuscar} />
            <input
              type="search"
              aria-label="Buscar evento"
              placeholder={isMobile ? 'Buscar evento ou local' : 'Buscar por nome, local ou cidade'}
              value={busca}
              onChange={(evento) => setBusca(evento.target.value)}
            />
          </label>
          {!carregando && categorias.length > 0 && (
            <div className="fornecedor__filtros" aria-label="Filtrar por categoria">
              {filtros.map((opcao) => (
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
          )}
        </section>

        {resultado.erro && !carregando ? (
          <ErroNaTela
            erro={resultado.erro}
            aoTentarDeNovo={() => setTentativa((valor) => valor + 1)}
          />
        ) : carregando ? (
          <Carregando mensagem="Buscando eventos nas suas categorias…" />
        ) : eventos.length > 0 ? (
          <>
            <section className="fornecedor__grade" aria-label="Eventos disponíveis">
              {eventos.map((evento) => (
                <CartaoEvento key={evento.event_key} evento={evento} />
              ))}
            </section>
            {!dados.is_last_page && (
              <button
                type="button"
                className="botao botao--secundario"
                disabled={carregandoMais}
                onClick={carregarMais}
              >
                {carregandoMais ? 'Carregando…' : 'Carregar mais eventos'}
              </button>
            )}
          </>
        ) : (
          <SemEventos filtrando={termo !== '' || filtro !== 'Minhas categorias'} />
        )}
      </>
    </OrganizadorLayout>
  )
}

function SemEventos({ filtrando }) {
  if (filtrando) {
    return (
      <Vazio
        icone="eventos"
        titulo="Nenhum evento para essa busca"
        mensagem="Tente outro nome, local ou categoria."
      />
    )
  }
  return (
    <Vazio
      icone="eventos"
      titulo="Nenhum evento aberto nas suas categorias"
      mensagem="Quando um organizador publicar um evento com itens nas suas categorias, ele aparece aqui. Você pode incluir mais categorias em Configurações."
    >
      <Link to="/fornecedor/configuracoes" className="botao botao--secundario">
        Ajustar categorias
      </Link>
    </Vazio>
  )
}
