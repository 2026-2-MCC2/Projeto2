import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from '../toasts.js'
import { destinoDaNotificacao } from '../components/notificacoes/tiposDeNotificacao.js'
import { useTempoReal } from './useTempoReal.jsx'

// notificações que chegam juntas (ex.: vários eventos publicados) viram um toast só
const JANELA_DE_AGRUPAMENTO_MS = 1200
// depois de um toast, o que chegar nesse intervalo espera e entra no próximo, também agrupado
const PAUSA_ENTRE_TOASTS_MS = 5000

// chave da proposta no fim do link (/fornecedor/propostas/:chave ou .../propostas/:chave)
const chaveDaPropostaNoLink = (link) => link?.match(/\/propostas\/([^/?]+)$/)?.[1] ?? null

// a pessoa já está vendo o que a notificação avisa: a própria tela ou a conversa aberta
function jaEstaNaTela(notificacao, { pathname, search }) {
  if (notificacao.link === pathname) return true
  // na tela de aprovações a lista já recarrega sozinha com o cadastro novo
  if (notificacao.type === 'user_pending' && pathname === '/admin/aprovacoes') return true
  if (notificacao.type !== 'message') return false
  const conversaAberta = new URLSearchParams(search).get('conversa')
  return conversaAberta !== null && conversaAberta === chaveDaPropostaNoLink(notificacao.link)
}

// montado uma vez na área do perfil: a fila sobrevive à troca de tela e o filtro usa a tela do momento do toast
export function useAvisoDeNotificacoes() {
  const { assinar } = useTempoReal()
  const localizacao = useLocation()
  const navigate = useNavigate()
  const localizacaoAtual = useRef(localizacao)
  const navegar = useRef(navigate)
  const fila = useRef([])
  const temporizador = useRef(null)
  const pausaAte = useRef(0)

  useEffect(() => {
    localizacaoAtual.current = localizacao
    navegar.current = navigate
  })

  useEffect(() => {
    const mostrar = () => {
      temporizador.current = null
      const recebidas = fila.current
        .splice(0)
        .filter((notificacao) => !jaEstaNaTela(notificacao, localizacaoAtual.current))
      if (recebidas.length === 0) return

      pausaAte.current = Date.now() + PAUSA_ENTRE_TOASTS_MS
      const ir = (destino) => navegar.current(destino, { viewTransition: true })
      if (recebidas.length === 1) {
        const [notificacao] = recebidas
        toast.info(notificacao.title, {
          descricao: notificacao.body,
          acao: notificacao.link && {
            rotulo: 'Ver',
            executar: () => ir(destinoDaNotificacao(notificacao)),
          },
        })
      } else {
        const perfil = localizacaoAtual.current.pathname.split('/')[1]
        toast.info(`${recebidas.length} novas notificações`, {
          acao: { rotulo: 'Ver', executar: () => ir(`/${perfil}/notificacoes`) },
        })
      }
    }

    const cancelar = assinar('notification', ({ notification }) => {
      if (jaEstaNaTela(notification, localizacaoAtual.current)) return
      fila.current.push(notification)
      const espera = Math.max(JANELA_DE_AGRUPAMENTO_MS, pausaAte.current - Date.now())
      temporizador.current ??= setTimeout(mostrar, espera)
    })

    return () => {
      cancelar()
      clearTimeout(temporizador.current)
      temporizador.current = null
      fila.current = []
    }
  }, [assinar])
}
