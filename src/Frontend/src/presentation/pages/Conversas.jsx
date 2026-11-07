import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { iniciais } from '../../domain/formatacao.js'
import { tempoRelativo } from '../../domain/tempoRelativo.js'
import { Carregando, ErroNaTela, Vazio } from '../components/comum/EstadoDaTela.jsx'
import { GavetaDaConversa } from '../components/conversa/Conversa.jsx'
import { ContadorDeNaoLidas } from '../components/notificacoes/ContadorDeNaoLidas.jsx'
import { OrganizadorLayout } from '../components/organizador/OrganizadorLayout.jsx'
import { useConversas } from '../hooks/useConversas.js'
import { useTempoReal } from '../hooks/useTempoReal.jsx'
import '../styles/chats.css'

// a conversa aberta fica na URL (?conversa=<proposta>): o voltar do celular fecha a tela cheia
const PARAMETRO_DA_URL = 'conversa'

const rotaDaProposta = (perfil, conversa) =>
  perfil === 'fornecedor'
    ? `/fornecedor/propostas/${conversa.proposal_key}`
    : `/organizador/eventos/${conversa.event_key}/propostas/${conversa.proposal_key}`

export function Conversas({ perfil = 'organizador' }) {
  const { mensagensNaoLidas } = useTempoReal()
  const [parametros, setParametros] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const aberta = parametros.get(PARAMETRO_DA_URL)
  const conversas = useConversas(aberta)
  const conversaAberta = conversas.itens.find((item) => item.proposal_key === aberta)

  // abrir pela lista cria uma entrada no histórico (o voltar fecha); trocar de conversa só substitui
  function abrir(chave) {
    conversas.zerarNaoLidas(chave)
    const jaTinhaConversa = parametros.has(PARAMETRO_DA_URL)
    setParametros(
      { [PARAMETRO_DA_URL]: chave },
      {
        replace: jaTinhaConversa,
        state: {
          abertaPelaLista: jaTinhaConversa ? Boolean(location.state?.abertaPelaLista) : true,
        },
      },
    )
  }

  // fechar desfaz a entrada criada ao abrir, para o voltar sair dos Chats com um clique
  function fechar() {
    if (location.state?.abertaPelaLista) navigate(-1)
    else setParametros({}, { replace: true })
    conversas.recarregar()
  }

  const total = mensagensNaoLidas.total
  const resumo =
    total === 0 ? 'Tudo lido' : total === 1 ? '1 mensagem não lida' : `${total} mensagens não lidas`

  return (
    <OrganizadorLayout perfil={perfil} titulo="Chats" apoio={resumo} estreito>
      <div className="pagina-chats">
        <ConteudoDosChats conversas={conversas} aoAbrir={abrir} />
      </div>

      {aberta && (
        <GavetaDaConversa
          key={aberta}
          chaveDaProposta={aberta}
          perfil={perfil}
          rotaDaProposta={conversaAberta ? rotaDaProposta(perfil, conversaAberta) : undefined}
          aoFechar={fechar}
        />
      )}
    </OrganizadorLayout>
  )
}

function ConteudoDosChats({ conversas, aoAbrir }) {
  if (conversas.carregando) return <Carregando mensagem="Carregando as conversas…" />
  if (conversas.erro && conversas.itens.length === 0) {
    return <ErroNaTela erro={conversas.erro} aoTentarDeNovo={conversas.recarregar} />
  }
  if (conversas.itens.length === 0) {
    return (
      <Vazio
        icone="propostas"
        titulo="Nenhuma conversa ainda"
        mensagem="As conversas começam pela proposta."
      />
    )
  }

  return (
    <ul className="chats">
      {conversas.itens.map((conversa) => (
        <li key={conversa.proposal_key}>
          <LinhaDoChat conversa={conversa} aoAbrir={() => aoAbrir(conversa.proposal_key)} />
        </li>
      ))}
    </ul>
  )
}

function LinhaDoChat({ conversa, aoAbrir }) {
  const { counterpart: outroLado, last_message: ultima, unread } = conversa

  return (
    <button
      type="button"
      className={`chat${unread > 0 ? ' chat--nao-lida' : ''}`}
      onClick={aoAbrir}
    >
      <span className="chat__avatar" aria-hidden="true">
        {iniciais(outroLado.name)}
        {outroLado.online && <span className="chat__online" />}
      </span>
      <span className="chat__texto">
        <span className="chat__linha">
          <strong className="chat__nome">{outroLado.name}</strong>
          <time className="chat__tempo" dateTime={ultima.created_at}>
            {tempoRelativo(ultima.created_at)}
          </time>
        </span>
        <span className="chat__contexto">
          {conversa.proposal_status === 'withdrawn' && (
            <span className="chat__retirada">Retirada · </span>
          )}
          {conversa.event_name} · {conversa.item_description}
        </span>
        <span className="chat__linha">
          <span className="chat__trecho">
            {ultima.mine && <span className="chat__voce">Você: </span>}
            {ultima.body}
          </span>
          <ContadorDeNaoLidas total={unread} className="chat__contador" />
        </span>
      </span>
      {outroLado.online && <span className="so-leitor">, online agora</span>}
    </button>
  )
}
