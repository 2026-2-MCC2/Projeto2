import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useSearchParams } from 'react-router-dom'
import { formatarMoeda, iniciais } from '../../../domain/formatacao.js'
import { Carregando, ErroNaTela } from '../comum/EstadoDaTela.jsx'
import { Icone } from '../comum/Icone.jsx'
import { traduzirStatusDaProposta } from '../../../application/propostas.js'
import { useConversa } from '../../hooks/useConversa.js'
import { useFocoPreso } from '../../hooks/useFocoPreso.js'
import { useIsMobile } from '../../hooks/useIsMobile.js'
import { useTempoReal } from '../../hooks/useTempoReal.jsx'
import iconeConversa from '../../assets/conversa/icone-conversa.svg'
import iconeEnviar from '../../assets/conversa/icone-enviar.svg'
import iconeLida from '../../assets/conversa/icone-lida.svg'
import iconeEnviada from '../../assets/conversa/icone-enviada.svg'
import iconeCadeado from '../../assets/conversa/icone-cadeado.svg'
import iconeEncerrada from '../../assets/conversa/icone-encerrada.svg'
import iconeFechar from '../../assets/conversa/icone-fechar.svg'
import iconeVoltar from '../../assets/conversa/icone-voltar.svg'
import '../../styles/conversa.css'

const LIMITE_DA_MENSAGEM = 2000
// o contador de caracteres só aparece perto do limite
const AVISO_DO_LIMITE = 1800
const PARAMETRO_DA_URL = 'conversa'
// o que foi digitado e não enviado, por proposta: sobrevive à troca entre o botão do desktop e o do celular
const rascunhos = new Map()

// a gaveta aberta fica na URL (?conversa=1): o link da notificação abre, e trocar de layout não fecha
export function BotaoDaConversa({ chaveDaProposta, perfil, rotulo = 'Conversa', className = '' }) {
  const { mensagensNaoLidas } = useTempoReal()
  const [parametros, setParametros] = useSearchParams()
  const aberta = parametros.get(PARAMETRO_DA_URL) === '1'
  const naoLidas = mensagensNaoLidas.porProposta[chaveDaProposta] ?? 0

  function mudarAberta(abrir) {
    const novos = new URLSearchParams(parametros)
    if (abrir) novos.set(PARAMETRO_DA_URL, '1')
    else novos.delete(PARAMETRO_DA_URL)
    setParametros(novos, { replace: true })
  }

  return (
    <>
      <button
        type="button"
        className={`botao botao--secundario botao-da-conversa ${className}`}
        onClick={() => mudarAberta(true)}
        aria-haspopup="dialog"
      >
        <Icone src={iconeConversa} />
        {rotulo}
        {naoLidas > 0 && (
          <span className="botao-da-conversa__contador">
            {naoLidas}
            <span className="so-leitor"> {naoLidas === 1 ? 'não lida' : 'não lidas'}</span>
          </span>
        )}
      </button>
      {aberta && (
        <GavetaDaConversa
          key={chaveDaProposta}
          chaveDaProposta={chaveDaProposta}
          perfil={perfil}
          aoFechar={() => mudarAberta(false)}
        />
      )}
    </>
  )
}

// desktop: gaveta lateral; celular: tela cheia. rotaDaProposta (aba Chats) mostra o link "Ver proposta"
export function GavetaDaConversa({ chaveDaProposta, perfil, rotaDaProposta, aoFechar }) {
  const isMobile = useIsMobile()
  const caixa = useFocoPreso()
  const { conversa, removida, erro, digitando, enviar, tentarDeNovo, avisarDigitando, recarregar } =
    useConversa(chaveDaProposta)

  useEffect(() => {
    const fecharNoEsc = (evento) => evento.key === 'Escape' && aoFechar()
    document.addEventListener('keydown', fecharNoEsc)
    const rolagemAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', fecharNoEsc)
      document.body.style.overflow = rolagemAnterior
    }
  }, [aoFechar])

  const outroLado = conversa?.counterpart
  const papelDoOutroLado = perfil === 'fornecedor' ? 'organizador' : 'fornecedor'

  return createPortal(
    <div className={`conversa-camada${isMobile ? ' conversa-camada--tela-cheia' : ''}`}>
      {!isMobile && (
        <div className="conversa-camada__fundo" onClick={aoFechar} aria-hidden="true" />
      )}
      <section
        ref={caixa}
        className="conversa"
        role="dialog"
        aria-modal="true"
        aria-labelledby="conversa-titulo"
        tabIndex={-1}
      >
        <header className="conversa__topo">
          {isMobile && (
            <button
              type="button"
              className="conversa__icone-botao"
              aria-label="Voltar"
              onClick={aoFechar}
            >
              <Icone src={iconeVoltar} />
            </button>
          )}
          <span className="conversa__avatar" aria-hidden="true">
            {iniciais(outroLado?.name ?? '')}
            {outroLado?.online && <span className="conversa__ponto-online" />}
          </span>
          <div className="conversa__quem">
            <h2 id="conversa-titulo">{outroLado?.name ?? 'Conversa'}</h2>
            <p className={outroLado?.online ? 'conversa__online' : undefined}>
              {outroLado?.online ? 'online agora' : papelDoOutroLado}
            </p>
          </div>
          {!isMobile && (
            <button
              type="button"
              className="conversa__icone-botao"
              aria-label="Fechar conversa"
              onClick={aoFechar}
            >
              <Icone src={iconeFechar} />
            </button>
          )}
        </header>

        {conversa && <ContextoDaProposta proposta={conversa.proposal} rota={rotaDaProposta} />}

        {removida && !conversa ? (
          <div className="conversa__estado">
            <p className="conversa__motivo">
              <Icone src={iconeEncerrada} />
              {MOTIVO_DA_REMOCAO}
            </p>
          </div>
        ) : erro && !conversa ? (
          <div className="conversa__estado">
            <ErroNaTela erro={erro} aoTentarDeNovo={recarregar} />
          </div>
        ) : !conversa ? (
          <div className="conversa__estado">
            <Carregando mensagem="Carregando a conversa…" />
          </div>
        ) : (
          <>
            <ListaDeMensagens
              conversa={conversa}
              removida={removida}
              perfil={perfil}
              nomeDoOutroLado={outroLado?.name}
              digitando={digitando}
              aoTentarDeNovo={tentarDeNovo}
            />
            {conversa.can_send ? (
              <CaixaDeEnvio
                chaveDaProposta={chaveDaProposta}
                perfil={perfil}
                noDesktop={!isMobile}
                aoEnviar={enviar}
                aoDigitar={avisarDigitando}
              />
            ) : (
              <p className="conversa__encerrada">
                <Icone src={iconeCadeado} />
                Conversa encerrada. Dá para ler, mas não enviar mensagens.
              </p>
            )}
          </>
        )}
      </section>
    </div>,
    document.body,
  )
}

function ContextoDaProposta({ proposta, rota }) {
  return (
    <div className="conversa__contexto">
      <div>
        <small>{proposta.event_name}</small>
        <p>
          {proposta.item_description} · {formatarMoeda(proposta.amount)}
        </p>
        {rota && (
          <Link to={rota} className="conversa__ver-proposta" viewTransition>
            Ver proposta
          </Link>
        )}
      </div>
      <span className={`conversa__situacao conversa__situacao--${proposta.status}`}>
        {traduzirStatusDaProposta(proposta.status)}
      </span>
    </div>
  )
}

function ListaDeMensagens({
  conversa,
  removida,
  perfil,
  nomeDoOutroLado,
  digitando,
  aoTentarDeNovo,
}) {
  const lista = useRef(null)
  const grupos = agruparPorDia(conversa.data)

  // a última mensagem e o "digitando…" ficam sempre à vista
  useLayoutEffect(() => {
    const elemento = lista.current
    if (elemento) elemento.scrollTop = elemento.scrollHeight
  }, [conversa.data.length, digitando])

  return (
    <div ref={lista} className="conversa__mensagens" aria-live="polite" aria-relevant="additions">
      {conversa.data.length === 0 && (
        <p className="conversa__vazia">
          {conversa.can_send
            ? `Nenhuma mensagem ainda. Tire dúvidas sobre a proposta com o ${perfil === 'fornecedor' ? 'organizador' : 'fornecedor'}.`
            : 'Nenhuma mensagem foi trocada nesta proposta.'}
        </p>
      )}
      {grupos.map(({ dia, mensagens }) => (
        <div key={dia} className="conversa__dia">
          <span className="conversa__separador">{dia}</span>
          {mensagens.map((mensagem) => (
            <Mensagem
              key={mensagem.message_key}
              mensagem={mensagem}
              aoTentarDeNovo={aoTentarDeNovo}
            />
          ))}
        </div>
      ))}
      {digitando && (
        <p className="conversa__digitando">{primeiroNome(nomeDoOutroLado)} está digitando…</p>
      )}
      {!conversa.can_send && (
        <p className="conversa__motivo">
          <Icone src={iconeEncerrada} />
          {removida ? MOTIVO_DA_REMOCAO : motivoDoEncerramento(conversa.proposal, perfil)}
        </p>
      )}
    </div>
  )
}

function Mensagem({ mensagem, aoTentarDeNovo }) {
  const classe = `conversa__mensagem conversa__mensagem--${mensagem.mine ? 'minha' : 'outro'}${mensagem.estado === 'erro' ? ' conversa__mensagem--erro' : ''}`

  return (
    <div className={classe}>
      <p>{mensagem.body}</p>
      <span className="conversa__hora">
        {mensagem.estado === 'enviando' ? 'Enviando…' : hora(mensagem.created_at)}
        {mensagem.mine && !mensagem.estado && (
          <span
            className={`conversa__marca${mensagem.read ? ' conversa__marca--lida' : ''}`}
            title={mensagem.read ? 'Lida' : 'Enviada'}
          >
            <Icone src={mensagem.read ? iconeLida : iconeEnviada} />
            <span className="so-leitor">{mensagem.read ? 'Lida' : 'Enviada'}</span>
          </span>
        )}
      </span>
      {mensagem.estado === 'erro' && (
        <button type="button" className="conversa__tentar" onClick={() => aoTentarDeNovo(mensagem)}>
          Não foi enviada. Tentar de novo
        </button>
      )}
    </div>
  )
}

function CaixaDeEnvio({ chaveDaProposta, perfil, noDesktop, aoEnviar, aoDigitar }) {
  const [texto, setTextoNaTela] = useState(() => rascunhos.get(chaveDaProposta) ?? '')
  const setTexto = (valor) => {
    setTextoNaTela(valor)
    if (valor) rascunhos.set(chaveDaProposta, valor)
    else rascunhos.delete(chaveDaProposta)
  }
  const campo = useRef(null)
  const podeEnviar = texto.trim().length > 0

  // no celular o teclado só abre quando a pessoa toca no campo, e o Enter do teclado quebra a linha
  useEffect(() => {
    if (noDesktop) campo.current.focus()
  }, [noDesktop])

  // cresce com o texto até umas 5 linhas
  useLayoutEffect(() => {
    const elemento = campo.current
    elemento.style.height = 'auto'
    elemento.style.height = `${Math.min(elemento.scrollHeight, 132)}px`
  }, [texto])

  function enviar(evento) {
    evento?.preventDefault()
    if (!podeEnviar) return
    aoEnviar(texto.trim())
    setTexto('')
    campo.current.focus()
  }

  return (
    <form className="conversa__envio" onSubmit={enviar}>
      <div className="conversa__campo">
        <label htmlFor="conversa-texto" className="so-leitor">
          Mensagem
        </label>
        <textarea
          id="conversa-texto"
          ref={campo}
          rows={1}
          value={texto}
          maxLength={LIMITE_DA_MENSAGEM}
          placeholder="Escreva uma mensagem"
          onChange={(evento) => {
            setTexto(evento.target.value)
            if (evento.target.value.trim()) aoDigitar()
          }}
          onKeyDown={(evento) => {
            if (
              noDesktop &&
              evento.key === 'Enter' &&
              !evento.shiftKey &&
              !evento.nativeEvent.isComposing
            ) {
              enviar(evento)
            }
          }}
        />
        <button
          type="submit"
          className="conversa__enviar"
          disabled={!podeEnviar}
          aria-label="Enviar mensagem"
        >
          <Icone src={iconeEnviar} />
        </button>
      </div>
      <p className="conversa__dica">
        {texto.length >= AVISO_DO_LIMITE
          ? `${texto.length} de ${LIMITE_DA_MENSAGEM} caracteres`
          : perfil === 'fornecedor'
            ? 'A conversa fica salva nesta proposta. Se mudar valor ou condições, edite a proposta.'
            : noDesktop
              ? 'A conversa fica salva nesta proposta. Enter envia, Shift+Enter quebra a linha.'
              : 'A conversa fica salva nesta proposta.'}
      </p>
    </form>
  )
}

const MOTIVO_DA_REMOCAO = 'Esta proposta não existe mais; a conversa foi encerrada'

function motivoDoEncerramento(proposta, perfil) {
  if (proposta.status === 'withdrawn') {
    return perfil === 'fornecedor'
      ? 'Você retirou esta proposta'
      : 'O fornecedor retirou esta proposta'
  }
  if (proposta.event_status === 'canceled') {
    return perfil === 'fornecedor' ? 'O organizador cancelou o evento' : 'O evento foi cancelado'
  }
  if (proposta.event_status === 'closed') return 'A cotação do evento foi encerrada'
  return 'A conversa foi encerrada'
}

function agruparPorDia(mensagens) {
  const grupos = []
  for (const mensagem of mensagens) {
    const dia = nomeDoDia(mensagem.created_at)
    const ultimo = grupos.at(-1)
    if (ultimo?.dia === dia) ultimo.mensagens.push(mensagem)
    else grupos.push({ dia, mensagens: [mensagem] })
  }
  return grupos
}

function nomeDoDia(dataIso) {
  const data = new Date(dataIso)
  const hoje = new Date()
  const ontem = new Date()
  ontem.setDate(hoje.getDate() - 1)
  if (data.toDateString() === hoje.toDateString()) return 'Hoje'
  if (data.toDateString() === ontem.toDateString()) return 'Ontem'
  return data.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'short',
    ...(data.getFullYear() !== hoje.getFullYear() && { year: 'numeric' }),
  })
}

function hora(dataIso) {
  return new Date(dataIso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function primeiroNome(nome) {
  return String(nome ?? 'O outro lado').split(/\s+/)[0]
}
