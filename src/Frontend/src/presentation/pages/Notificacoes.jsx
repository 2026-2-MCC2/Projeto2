import { useState } from 'react'
import { OrganizadorLayout } from '../components/organizador/OrganizadorLayout.jsx'
import { ConteudoDaLista } from '../components/notificacoes/PainelDeNotificacoes.jsx'
import { FiltrosDeNotificacoes } from '../components/notificacoes/ListaDeNotificacoes.jsx'
import { filtrarNotificacoes } from '../components/notificacoes/tiposDeNotificacao.js'
import { useNotificacoes } from '../hooks/useNotificacoes.js'
import { useIsMobile } from '../hooks/useIsMobile.js'
import { useTempoReal } from '../hooks/useTempoReal.jsx'
import '../styles/notificacoes.css'

// "Ver todas" do painel no desktop e a tela do sininho no celular
export function Notificacoes({ perfil = 'organizador' }) {
  const { notificacoesNaoLidas } = useTempoReal()
  const isMobile = useIsMobile()
  const notificacoes = useNotificacoes({ limite: 20 })
  const [filtro, setFiltro] = useState('todas')
  const visiveis = filtrarNotificacoes(notificacoes.itens, filtro)
  const resumo =
    notificacoesNaoLidas === 0
      ? 'Tudo lido'
      : notificacoesNaoLidas === 1
        ? '1 não lida'
        : `${notificacoesNaoLidas} não lidas`
  // volta para onde a pessoa estava; quem entrou direto pelo link volta para a área do perfil
  const veioDeOutraTela = (window.history.state?.idx ?? 0) > 0

  return (
    <OrganizadorLayout
      perfil={perfil}
      titulo="Notificações"
      apoio={resumo}
      voltarPara={veioDeOutraTela ? -1 : `/${perfil}`}
      estreito
    >
      <div className="pagina-notificacoes">
        <div className="pagina-notificacoes__barra">
          <FiltrosDeNotificacoes
            filtro={filtro}
            aoMudar={setFiltro}
            naoLidas={notificacoesNaoLidas}
          />
          {notificacoesNaoLidas > 0 && (
            <button
              type="button"
              className="notificacoes__marcar"
              onClick={notificacoes.marcarTodas}
            >
              {isMobile ? 'Marcar como lidas' : 'Marcar todas como lidas'}
            </button>
          )}
        </div>

        <ConteudoDaLista
          notificacoes={notificacoes}
          visiveis={visiveis}
          filtro={filtro}
          aoAbrir={notificacoes.marcarComoLida}
          agrupar
        />

        {notificacoes.temMais && (
          <button
            type="button"
            className="botao botao--secundario pagina-notificacoes__mais"
            onClick={notificacoes.carregarMais}
            disabled={notificacoes.carregandoMais}
          >
            {notificacoes.carregandoMais ? 'Carregando…' : 'Carregar mais'}
          </button>
        )}
      </div>
    </OrganizadorLayout>
  )
}
