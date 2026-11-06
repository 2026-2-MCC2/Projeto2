import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { formatarDataEHora, formatarMoeda, formatarPeriodo } from '../../../application/eventos.js'
import {
  buscarMinhaProposta,
  formatarValidade,
  propostaPodeSerAlterada,
  retirarProposta,
} from '../../../application/propostas.js'
import { descartarRascunho } from '../../../application/rascunhosDePropostas.js'
import {
  comparacaoComPrevisto,
  formatarData,
  formatarTelefone,
} from '../../../domain/formatacao.js'
import { Carregando, ErroNaTela, Vazio } from '../../components/comum/EstadoDaTela.jsx'
import { Icone } from '../../components/comum/Icone.jsx'
import { Modal } from '../../components/comum/Modal.jsx'
import { TituloDaPagina } from '../../components/comum/TituloDaPagina.jsx'
import { EtiquetaDaProposta } from '../../components/fornecedor/EtiquetaDaProposta.jsx'
import { FotoDoServico } from '../../components/fornecedor/FotoDoServico.jsx'
import { ObservacaoDoOrganizador } from '../../components/fornecedor/ObservacaoDoOrganizador.jsx'
import { Cartao } from '../../components/organizador/Cartao.jsx'
import { Botao } from '../../components/organizador/Formulario.jsx'
import { OrganizadorLayout } from '../../components/organizador/OrganizadorLayout.jsx'
import { toast } from '../../toasts.js'
import { useIsMobile } from '../../hooks/useIsMobile.js'
import { ENTRAR_NA_EDICAO } from '../../hooks/usePropostaEmEdicao.js'
import { useRenovarFotosVencidas } from '../../hooks/useRenovarFotosVencidas.js'
import iconeRetirar from '../../assets/admin/icone-modal-rejeitar.svg'
import iconeVoltar from '../../assets/organizador/icone-voltar.svg'
import iconeAvancar from '../../assets/organizador/icone-avancar.svg'
import iconeCalendario from '../../assets/fornecedor/icone-calendario.svg'
import iconeLocal from '../../assets/fornecedor/icone-local.svg'
import iconeFeito from '../../assets/fornecedor/icone-feito.svg'
import iconeRecusado from '../../assets/fornecedor/icone-recusado.svg'
import iconeInfo from '../../assets/fornecedor/icone-info.svg'
import iconeEscolhida from '../../assets/fornecedor/icone-escolhida.svg'
import iconeCancelado from '../../assets/fornecedor/icone-cancelado.svg'
import iconePessoa from '../../assets/fornecedor/icone-pessoa.svg'
import iconeEmail from '../../assets/fornecedor/icone-email.svg'
import iconeTelefone from '../../assets/fornecedor/icone-telefone.svg'
import '../../styles/fornecedor.css'

const VOLTAR_PARA = '/fornecedor/propostas'

const TEXTOS_DA_DESCRICAO = [
  { campo: 'description', rotulo: 'O que está incluído' },
  { campo: 'not_included', rotulo: 'O que não está incluído' },
  { campo: 'notes', rotulo: 'Observações' },
]

function ModalRetirar({ proposta, retirando, aoConfirmar, aoFechar }) {
  return (
    <Modal
      icone={iconeRetirar}
      corDoIcone="vermelho"
      titulo="Retirar esta proposta?"
      mensagem="Ela some da comparação do organizador. Enquanto o evento estiver em cotação, você pode enviar uma nova proposta para o item."
      dados={[
        { rotulo: 'Item', valor: proposta.item.description },
        { rotulo: 'Valor', valor: formatarMoeda(proposta.amount) },
      ]}
      acao={{
        cancelar: 'Cancelar',
        confirmar: retirando ? 'Retirando...' : 'Retirar proposta',
        aoConfirmar: aoConfirmar,
        ocupado: retirando,
      }}
      aoFechar={aoFechar}
    />
  )
}

export function DetalheDaProposta() {
  const { proposalKey } = useParams()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [tentativa, setTentativa] = useState(0)
  const [resultado, setResultado] = useState({ chave: null, proposta: null, erro: null })
  const [confirmandoRetirada, setConfirmandoRetirada] = useState(false)
  const [retirando, setRetirando] = useState(false)
  const carregando = resultado.chave !== proposalKey
  // só as fotos são trocadas: se o pedido falhar, a página continua como estava
  const aoFalharFoto = useRenovarFotosVencidas(() =>
    buscarMinhaProposta(proposalKey)
      .then((atualizada) =>
        setResultado((atual) =>
          atual.chave === proposalKey && atual.proposta
            ? { ...atual, proposta: { ...atual.proposta, photos: atualizada.photos } }
            : atual,
        ),
      )
      .catch(() => {}),
  )

  useEffect(() => {
    let telaAberta = true
    buscarMinhaProposta(proposalKey)
      .then((proposta) => {
        if (telaAberta) setResultado({ chave: proposalKey, proposta, erro: null })
      })
      .catch((erro) => {
        if (telaAberta) setResultado({ chave: proposalKey, proposta: null, erro })
      })

    return () => {
      telaAberta = false
    }
  }, [proposalKey, tentativa])

  async function confirmarRetirada() {
    setRetirando(true)
    try {
      await retirarProposta(proposalKey)
      const { event, item } = resultado.proposta
      // a edição deixada pela metade não pode virar o começo da proposta nova para o item
      descartarRascunho(event.event_key, item.item_key)
      toast.sucesso('Proposta retirada', { descricao: item.description })
      navigate(VOLTAR_PARA, { replace: true })
    } catch (falha) {
      // ex.: o organizador aceitou ou recusou no meio tempo ("…não pode mais ser alterada nem retirada.")
      toast.erro('Não foi possível retirar a proposta', { descricao: falha.message })
      setRetirando(false)
      setConfirmandoRetirada(false)
      setTentativa((valor) => valor + 1)
    }
  }

  if (carregando) {
    return (
      <OrganizadorLayout perfil="fornecedor" titulo="Proposta" voltarPara={VOLTAR_PARA}>
        <Carregando mensagem="Carregando a proposta…" />
      </OrganizadorLayout>
    )
  }

  if (resultado.erro) {
    return (
      <OrganizadorLayout perfil="fornecedor" titulo="Proposta" voltarPara={VOLTAR_PARA}>
        {resultado.erro.status === 404 ? (
          <Vazio
            icone="atencao"
            titulo="Proposta não encontrada"
            mensagem="Ela pode ter sido retirada. Confira suas propostas na lista."
          >
            <Link to={VOLTAR_PARA} className="botao botao--secundario">
              Ver minhas propostas
            </Link>
          </Vazio>
        ) : (
          <ErroNaTela
            erro={resultado.erro}
            aoTentarDeNovo={() => setTentativa((valor) => valor + 1)}
          />
        )}
      </OrganizadorLayout>
    )
  }

  const proposta = resultado.proposta
  const { event: evento, item } = proposta
  const podeAlterar = propostaPodeSerAlterada(proposta)
  const acoes = podeAlterar && (
    <div className="detalhe-da-proposta__acoes">
      <Botao
        type="button"
        secundario
        className="detalhe-da-proposta__retirar"
        onClick={() => setConfirmandoRetirada(true)}
      >
        Retirar proposta
      </Botao>
      <Link
        to={`/fornecedor/eventos/${evento.event_key}/itens/${item.item_key}/propostas/etapa-1`}
        state={ENTRAR_NA_EDICAO}
        className="botao"
      >
        Editar proposta
      </Link>
    </div>
  )

  const conteudo = (
    <div className="detalhe-da-proposta">
      {!isMobile && (
        <header className="detalhe-da-proposta__cabecalho">
          <div>
            <Link to={VOLTAR_PARA} className="evento-topo__voltar" viewTransition>
              <Icone src={iconeVoltar} />
              Minhas propostas
            </Link>
            <div className="resumo-do-evento__nome">
              <h1>{item.description}</h1>
              <EtiquetaDaProposta status={proposta.status} />
            </div>
            <p className="detalhe-da-proposta__evento">
              <span>
                <Icone src={iconeCalendario} />
                {evento.name} · {formatarPeriodo(evento.start_date, evento.end_date)}
              </span>
              <span>
                <Icone src={iconeLocal} />
                {evento.venue_name} · {evento.city}, {evento.state}
              </span>
            </p>
          </div>
          {acoes}
        </header>
      )}

      {isMobile && (
        <p className="detalhe-da-proposta__situacao-mobile">
          <EtiquetaDaProposta status={proposta.status} />
          Enviada em {formatarData(proposta.sent_at)}
        </p>
      )}

      <AvisoDaProposta proposta={proposta} />
      <LinhaDoTempo proposta={proposta} podeAlterar={podeAlterar} />

      <div className="colunas">
        <div className="colunas__principal">
          <SuaProposta proposta={proposta} />

          <Cartao titulo="Descrição enviada">
            <div className="detalhe-proposta__textos">
              {TEXTOS_DA_DESCRICAO.filter(({ campo }) => proposta[campo]).map(
                ({ campo, rotulo }) => (
                  <div key={campo}>
                    <h3>{rotulo}</h3>
                    <p>{proposta[campo]}</p>
                  </div>
                ),
              )}
            </div>
          </Cartao>

          {proposta.photos?.length > 0 && (
            <Cartao titulo="Fotos enviadas">
              <div className="proposta-detalhes__galeria">
                {proposta.photos.map((foto, indice) => (
                  <FotoDoServico
                    key={foto.photo_key}
                    foto={foto}
                    indice={indice}
                    aoFalharFoto={aoFalharFoto}
                  />
                ))}
              </div>
            </Cartao>
          )}
        </div>

        <aside className="colunas__lateral">
          <ItemCotado proposta={proposta} />
          {proposta.organizer_contact && (
            <ContatoDoOrganizador contato={proposta.organizer_contact} />
          )}
          <dl className="detalhe-da-proposta__envio">
            <div>
              <dt>Enviada em</dt>
              <dd>{formatarDataEHora(proposta.sent_at)}</dd>
            </div>
          </dl>
        </aside>
      </div>

      {isMobile && acoes}
    </div>
  )

  return (
    <OrganizadorLayout
      perfil="fornecedor"
      titulo={isMobile ? item.description : undefined}
      apoio={`${evento.name} · ${formatarPeriodo(evento.start_date, evento.end_date)}`}
      voltarPara={VOLTAR_PARA}
    >
      {!isMobile && <TituloDaPagina titulo={item.description} />}
      {conteudo}

      {confirmandoRetirada && (
        <ModalRetirar
          proposta={proposta}
          retirando={retirando}
          aoConfirmar={confirmarRetirada}
          aoFechar={() => !retirando && setConfirmandoRetirada(false)}
        />
      )}
    </OrganizadorLayout>
  )
}

function passosDaProposta(proposta) {
  const enviada = { nome: 'Enviada', apoio: formatarData(proposta.sent_at), estado: 'feito' }
  if (proposta.status === 'canceled') {
    return [
      enviada,
      { nome: 'Evento cancelado', apoio: 'O organizador cancelou o evento', estado: 'cancelado' },
    ]
  }

  const emCotacao = proposta.event.status === 'open_for_quotes'
  const analises = {
    sent: {
      nome: 'Em análise',
      apoio: 'Quando o organizador começar a comparar',
      estado: emCotacao ? 'proximo' : 'futuro',
    },
    under_review: {
      nome: 'Em análise',
      apoio: 'O organizador está comparando as propostas',
      estado: 'proximo',
    },
  }
  const analise = analises[proposta.status] ?? {
    nome: 'Em análise',
    apoio: 'O organizador comparou as propostas',
    estado: 'feito',
  }

  const decisoes = {
    accepted: { nome: 'Aceita', apoio: 'Sua proposta foi escolhida', estado: 'feito' },
    rejected: { nome: 'Recusada', apoio: 'Outra proposta foi escolhida', estado: 'recusado' },
  }
  const decisao = decisoes[proposta.status] ?? {
    nome: 'Decisão',
    apoio: 'O organizador escolhe uma proposta por item',
    estado: 'futuro',
  }

  return [enviada, analise, decisao]
}

const ICONE_DO_PASSO = { feito: iconeFeito, recusado: iconeRecusado, cancelado: iconeRecusado }

function LinhaDoTempo({ proposta, podeAlterar }) {
  const passos = passosDaProposta(proposta)
  const nota = podeAlterar
    ? 'Dá para editar ou retirar enquanto a proposta estiver Enviada e o evento em cotação.'
    : proposta.status === 'sent' &&
      'O evento não está mais em cotação: a proposta não pode ser editada nem retirada.'

  return (
    <section className="linha-do-tempo" aria-label="Andamento da proposta">
      <ol className="linha-do-tempo__passos">
        {passos.map((passo, indice) => (
          <li
            key={passo.nome}
            className={`linha-do-tempo__passo linha-do-tempo__passo--${passo.estado}`}
          >
            <span className="linha-do-tempo__marcador">
              {ICONE_DO_PASSO[passo.estado] ? (
                <Icone src={ICONE_DO_PASSO[passo.estado]} />
              ) : (
                indice + 1
              )}
            </span>
            <span className="linha-do-tempo__texto">
              <strong>{passo.nome}</strong>
              <small>{passo.apoio}</small>
            </span>
          </li>
        ))}
      </ol>
      {nota && (
        <p className="linha-do-tempo__nota">
          <Icone src={iconeInfo} />
          {nota}
        </p>
      )}
    </section>
  )
}

function AvisoDaProposta({ proposta }) {
  if (proposta.status === 'accepted') {
    return (
      <Aviso tom="sucesso" icone={iconeEscolhida} titulo="Sua proposta foi escolhida!">
        O valor entrou no orçamento do evento. Combine os próximos passos direto com o organizador.
      </Aviso>
    )
  }
  if (proposta.status === 'rejected') {
    return (
      <Aviso
        tom="neutro"
        icone={iconeRecusado}
        titulo="O organizador escolheu outra proposta para este item."
      >
        Ela fica aqui só para consulta. Continue de olho em Eventos disponíveis.
      </Aviso>
    )
  }
  if (proposta.status === 'canceled') {
    const motivo = proposta.event.cancellation_reason
    return (
      <Aviso tom="perigo" icone={iconeCancelado} titulo="O organizador cancelou o evento.">
        {motivo && `Motivo informado: “${motivo.replace(/[.!]+$/, '')}.” `}
        {/* o contato só vem para quem estava com a proposta aceita e pode ter tido custo */}
        {proposta.organizer_contact
          ? 'Se você já teve custos com este evento, fale com o organizador pelo contato desta página.'
          : 'Esta proposta foi encerrada e não precisa de nenhuma ação sua.'}
      </Aviso>
    )
  }
  return null
}

function Aviso({ tom, icone, titulo, children }) {
  return (
    <div className={`aviso-da-proposta aviso-da-proposta--${tom}`} role="note">
      <Icone src={icone} />
      <div>
        <strong>{titulo}</strong>
        <p>{children}</p>
      </div>
    </div>
  )
}

function SuaProposta({ proposta }) {
  const previsto = proposta.item.estimated_value
  const comparacao = comparacaoComPrevisto(proposta.amount, previsto)
  const condicoes = [
    ['Validade', formatarValidade(proposta.valid_until)],
    ['Prazo de entrega ou montagem', proposta.delivery_terms],
    ['Condição de pagamento', proposta.payment_terms],
    ['Equipe envolvida', proposta.team],
    ['Garantia ou substituição', proposta.warranty],
  ].filter(([, valor]) => valor)

  return (
    <section className="cartao sua-proposta" aria-label="Sua proposta">
      <div className="sua-proposta__valor">
        <div>
          <span>Valor proposto</span>
          <strong>{formatarMoeda(proposta.amount)}</strong>
        </div>
        {comparacao && (
          <p
            className={`sua-proposta__comparacao${proposta.amount > previsto ? ' sua-proposta__comparacao--acima' : ''}`}
          >
            <strong>{comparacao}</strong>
            Previsto: {formatarMoeda(previsto)}
          </p>
        )}
      </div>
      <dl className="linhas-de-dados">
        {condicoes.map(([rotulo, valor]) => (
          <div key={rotulo}>
            <dt>{rotulo}</dt>
            <dd>{valor}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function ItemCotado({ proposta }) {
  const { item, event: evento } = proposta
  const dados = [
    ['Categoria', item.category],
    ['Tipo', item.type === 'product' ? 'Produto' : 'Serviço'],
    ['Quantidade', Number(item.quantity).toLocaleString('pt-BR')],
    item.estimated_value != null && ['Orçamento previsto', formatarMoeda(item.estimated_value)],
  ].filter(Boolean)

  return (
    <Cartao titulo="Item cotado">
      <dl className="linhas-de-dados linhas-de-dados--compactas">
        {dados.map(([rotulo, valor]) => (
          <div key={rotulo}>
            <dt>{rotulo}</dt>
            <dd>{valor}</dd>
          </div>
        ))}
      </dl>
      {item.notes && <ObservacaoDoOrganizador texto={item.notes} />}
      {evento.status === 'open_for_quotes' && (
        <Link to={`/fornecedor/eventos/${evento.event_key}`} className="link-com-seta">
          Ver itens do evento
          <Icone src={iconeAvancar} />
        </Link>
      )}
    </Cartao>
  )
}

function ContatoDoOrganizador({ contato }) {
  return (
    <section className="contato-do-organizador" aria-label="Contato do organizador">
      <h2>Contato do organizador</h2>
      <ul>
        <li>
          <Icone src={iconePessoa} />
          <strong>{contato.name}</strong>
        </li>
        {contato.email && (
          <li>
            <Icone src={iconeEmail} />
            <a href={`mailto:${contato.email}`}>{contato.email}</a>
          </li>
        )}
        {contato.phone && (
          <li>
            <Icone src={iconeTelefone} />
            <a href={`tel:${contato.phone}`}>{formatarTelefone(contato.phone)}</a>
          </li>
        )}
      </ul>
    </section>
  )
}
