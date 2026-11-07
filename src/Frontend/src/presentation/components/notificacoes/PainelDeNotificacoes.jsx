import { useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useFocoPreso } from '../../hooks/useFocoPreso.js'
import { useNotificacoes } from '../../hooks/useNotificacoes.js'
import { useTempoReal } from '../../hooks/useTempoReal.jsx'
import { Icone } from '../comum/Icone.jsx'
import { ContadorDeNaoLidas } from './ContadorDeNaoLidas.jsx'
import { FiltrosDeNotificacoes, ListaDeNotificacoes } from './ListaDeNotificacoes.jsx'
import { filtrarNotificacoes } from './tiposDeNotificacao.js'
import iconeSino from '../../assets/comum/icone-sino.svg'
import '../../styles/notificacoes.css'

const MARGEM_DA_TELA = 12

// sininho ao lado da marca, no topo do menu lateral (desktop); abre o painel ao lado do menu
export function NotificacoesDoMenu({ perfil }) {
  const { notificacoesNaoLidas } = useTempoReal()
  const { pathname } = useLocation()
  // aberto só na página em que foi aberto: trocar de página (clique numa notificação) fecha o painel
  const [abertoEm, setAbertoEm] = useState(null)
  const aberto = abertoEm === pathname
  const botao = useRef(null)
  const idDoPainel = useId()
  const naPagina = pathname === `/${perfil}/notificacoes`

  return (
    <>
      <button
        ref={botao}
        type="button"
        className={`menu__sino${aberto || naPagina ? ' menu__sino--ativo' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={aberto}
        aria-controls={aberto ? idDoPainel : undefined}
        onClick={() => setAbertoEm(aberto ? null : pathname)}
      >
        <Icone src={iconeSino} />
        <span className="so-leitor">Notificações</span>
        <ContadorDeNaoLidas
          total={notificacoesNaoLidas}
          maximo={9}
          className="menu__sino-contador"
        />
      </button>

      {aberto && (
        <Painel
          id={idDoPainel}
          perfil={perfil}
          ancora={botao}
          aoFechar={(devolverFoco = true) => {
            setAbertoEm(null)
            if (devolverFoco) botao.current?.focus()
          }}
        />
      )}
    </>
  )
}

// fixo ao lado do item do menu; curto, o resto fica em "Ver todas"
const ALTURA_MAXIMA_DO_PAINEL = 440

function posicaoAoLado(ancora) {
  const retangulo = ancora.getBoundingClientRect()
  const menu = ancora.closest('.menu')?.getBoundingClientRect() ?? retangulo
  const topo = Math.max(MARGEM_DA_TELA, retangulo.top - 8)
  return {
    left: menu.right + 8,
    top: topo,
    maxHeight: Math.min(ALTURA_MAXIMA_DO_PAINEL, window.innerHeight - topo - MARGEM_DA_TELA),
  }
}

function Painel({ id, perfil, ancora, aoFechar }) {
  const caixa = useFocoPreso()
  const { notificacoesNaoLidas } = useTempoReal()
  const notificacoes = useNotificacoes({ limite: 8 })
  const [filtro, setFiltro] = useState('todas')
  const [posicao, setPosicao] = useState(() => posicaoAoLado(ancora.current))

  useEffect(() => {
    const posicionar = () => setPosicao(posicaoAoLado(ancora.current))
    window.addEventListener('resize', posicionar)
    return () => window.removeEventListener('resize', posicionar)
  }, [ancora])

  useEffect(() => {
    function cliqueFora(evento) {
      if (caixa.current?.contains(evento.target) || ancora.current?.contains(evento.target)) return
      aoFechar(false)
    }
    document.addEventListener('mousedown', cliqueFora)
    return () => document.removeEventListener('mousedown', cliqueFora)
  }, [caixa, ancora, aoFechar])

  const visiveis = filtrarNotificacoes(notificacoes.itens, filtro)

  return (
    <div
      ref={caixa}
      id={id}
      role="dialog"
      aria-label="Notificações"
      tabIndex={-1}
      className="painel-notificacoes"
      style={posicao}
      onKeyDown={(evento) => {
        if (evento.key === 'Escape') {
          evento.stopPropagation()
          aoFechar()
        }
      }}
    >
      <div className="painel-notificacoes__cabecalho">
        <h2>Notificações</h2>
        {notificacoesNaoLidas > 0 && (
          <button type="button" className="notificacoes__marcar" onClick={notificacoes.marcarTodas}>
            Marcar todas como lidas
          </button>
        )}
      </div>
      <FiltrosDeNotificacoes filtro={filtro} aoMudar={setFiltro} naoLidas={notificacoesNaoLidas} />

      <div className="painel-notificacoes__rolagem">
        <ConteudoDaLista
          notificacoes={notificacoes}
          visiveis={visiveis}
          filtro={filtro}
          aoAbrir={notificacoes.marcarComoLida}
        />
      </div>

      <Link
        to={`/${perfil}/notificacoes`}
        className="painel-notificacoes__ver-todas"
        viewTransition
      >
        Ver todas as notificações
      </Link>
    </div>
  )
}

export function ConteudoDaLista({ notificacoes, visiveis, filtro, aoAbrir, agrupar = false }) {
  if (notificacoes.carregando) {
    return (
      <p className="notificacoes__estado" role="status">
        Carregando notificações…
      </p>
    )
  }
  if (notificacoes.erro && notificacoes.itens.length === 0) {
    return (
      <div className="notificacoes__estado" role="alert">
        <p>Não foi possível carregar as notificações.</p>
        <button type="button" className="notificacoes__marcar" onClick={notificacoes.carregar}>
          Tentar de novo
        </button>
      </div>
    )
  }
  if (visiveis.length === 0) {
    return (
      <p className="notificacoes__estado">
        {filtro === 'nao-lidas'
          ? 'Nenhuma notificação não lida.'
          : 'Você ainda não tem notificações.'}
      </p>
    )
  }
  return <ListaDeNotificacoes itens={visiveis} aoAbrir={aoAbrir} agrupar={agrupar} />
}
