import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  formatarDataEHora,
  formatarHorario,
  formatarMoeda,
  formatarPeriodo,
} from '../../../application/eventos.js'
import { comparacaoComPrevisto } from '../../../domain/formatacao.js'
import { Carregando, ErroNaTela, Vazio } from '../../components/comum/EstadoDaTela.jsx'
import { Icone } from '../../components/comum/Icone.jsx'
import { TituloDaPagina } from '../../components/comum/TituloDaPagina.jsx'
import { AbasDeFiltro } from '../../components/fornecedor/AbasDeFiltro.jsx'
import { EtiquetaDaProposta } from '../../components/fornecedor/EtiquetaDaProposta.jsx'
import { ObservacaoDoOrganizador } from '../../components/fornecedor/ObservacaoDoOrganizador.jsx'
import { OrganizadorLayout } from '../../components/organizador/OrganizadorLayout.jsx'
import { useEventoDisponivel } from '../../hooks/useEventoDisponivel.js'
import { useIsMobile } from '../../hooks/useIsMobile.js'
import { ENTRAR_NA_EDICAO } from '../../hooks/usePropostaEmEdicao.js'
import iconeVoltar from '../../assets/organizador/icone-voltar.svg'
import iconeAvancar from '../../assets/organizador/icone-avancar.svg'
import iconeCalendario from '../../assets/fornecedor/icone-calendario.svg'
import iconeLocal from '../../assets/fornecedor/icone-local.svg'
import iconePublico from '../../assets/fornecedor/icone-publico.svg'
import iconeItens from '../../assets/fornecedor/icone-itens.svg'
import iconeEnviar from '../../assets/comum/icone-enviar.svg'
import iconeFeito from '../../assets/fornecedor/icone-feito.svg'
import '../../styles/fornecedor.css'

const LISTA_DE_EVENTOS = '/fornecedor/eventos'
const pessoas = (quantidade) => Number(quantidade).toLocaleString('pt-BR')

const FILTROS = {
  todos: () => true,
  // item em que o organizador já escolheu outra proposta não conta como pendente;
  // a retirada conta como pendente, porque dá para enviar de novo
  falta: (item) => !propostaAtiva(item) && !item.decided,
  enviadas: (item) => propostaAtiva(item),
}

function propostaAtiva(item) {
  return Boolean(item.my_proposal) && item.my_proposal.status !== 'withdrawn'
}

export function EventoDisponivel() {
  const { id } = useParams()
  const isMobile = useIsMobile()
  const { carregando, evento, erro, tentarDeNovo } = useEventoDisponivel(id)
  const [filtro, setFiltro] = useState('todos')

  if (carregando || erro) {
    return (
      <OrganizadorLayout
        perfil="fornecedor"
        titulo={carregando ? 'Carregando evento…' : 'Evento indisponível'}
        voltarPara={LISTA_DE_EVENTOS}
      >
        {carregando ? (
          <Carregando mensagem="Carregando os itens disponíveis…" />
        ) : erro.status === 404 ? (
          <Vazio
            icone="atencao"
            titulo="Este evento não está mais disponível"
            mensagem="O organizador cancelou ou encerrou a cotação, ou o evento não tem mais itens nas suas categorias. Suas propostas continuam em Minhas propostas."
          >
            <Link to={LISTA_DE_EVENTOS} className="botao botao--secundario">
              Ver eventos disponíveis
            </Link>
          </Vazio>
        ) : (
          <ErroNaTela erro={erro} aoTentarDeNovo={tentarDeNovo} />
        )}
      </OrganizadorLayout>
    )
  }

  const itens = evento.items
  const enviadas = itens.filter(FILTROS.enviadas).length
  const faltam = itens.filter(FILTROS.falta).length
  const visiveis = itens.filter(FILTROS[filtro])
  // item que o organizador decidiu sem proposta minha não entra no "Você enviou X de Y"
  const cotaveis = itens.filter((item) => propostaAtiva(item) || !item.decided)

  const conteudo = (
    <>
      <ResumoDoEvento evento={evento} faltam={faltam} comCabecalho={!isMobile} />

      {itens.length === 0 ? (
        <Vazio icone="eventos" titulo="Nenhum item nas suas categorias" />
      ) : (
        <>
          <div className="itens-do-evento__filtros">
            <AbasDeFiltro
              rotulo="Filtrar itens"
              ativa={filtro}
              aoMudar={setFiltro}
              abas={[
                {
                  chave: 'todos',
                  rotulo: isMobile ? 'Todos' : 'Todos os itens',
                  quantidade: itens.length,
                },
                { chave: 'falta', rotulo: 'Falta enviar', quantidade: faltam },
                { chave: 'enviadas', rotulo: 'Enviadas', quantidade: enviadas },
              ]}
            />
            <Andamento itens={cotaveis} />
          </div>

          <div className="colunas">
            <div className="colunas__principal">
              {visiveis.length === 0 ? (
                <p className="itens-do-evento__vazio">
                  {filtro === 'falta'
                    ? 'Você já enviou proposta para todos os itens deste evento.'
                    : 'Você ainda não enviou proposta para nenhum item.'}
                </p>
              ) : (
                <ul className="itens-do-evento">
                  {visiveis.map((item) => (
                    <CartaoDoItem key={item.item_key} eventKey={id} item={item} />
                  ))}
                </ul>
              )}
            </div>
            <aside className="colunas__lateral">
              <LocalEHorario evento={evento} />
              <ComoFunciona />
            </aside>
          </div>
        </>
      )}
    </>
  )

  if (isMobile) {
    return (
      <OrganizadorLayout
        perfil="fornecedor"
        titulo={evento.name}
        apoio={['Em cotação', evento.organizer_name].filter(Boolean).join(' · ')}
        voltarPara={LISTA_DE_EVENTOS}
      >
        {conteudo}
      </OrganizadorLayout>
    )
  }

  return (
    <OrganizadorLayout perfil="fornecedor">
      <TituloDaPagina titulo={evento.name} />
      {conteudo}
    </OrganizadorLayout>
  )
}

function ResumoDoEvento({ evento, faltam, comCabecalho }) {
  const descricao = [
    evento.description,
    evento.organizer_name && `Organizado por ${evento.organizer_name}.`,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <section className="resumo-do-evento" aria-label="Resumo do evento">
      {comCabecalho && (
        <>
          <Link to={LISTA_DE_EVENTOS} className="evento-topo__voltar" viewTransition>
            <Icone src={iconeVoltar} />
            Eventos disponíveis
          </Link>
          <div className="resumo-do-evento__nome">
            <h1>{evento.name}</h1>
            <span className="etiqueta etiqueta--cotacao">Em cotação</span>
          </div>
        </>
      )}
      {descricao && <p className="resumo-do-evento__descricao">{descricao}</p>}

      <dl className="resumo-do-evento__numeros">
        <Numero
          icone={iconeCalendario}
          rotulo="Quando"
          valor={formatarPeriodo(evento.start_date, evento.end_date)}
          apoio={`${formatarHorario(evento.start_date)} às ${formatarHorario(evento.end_date)}`}
        />
        <Numero
          icone={iconeLocal}
          rotulo="Onde"
          valor={evento.venue_name}
          apoio={`${evento.city}, ${evento.state}`}
        />
        <Numero
          icone={iconePublico}
          rotulo="Público esperado"
          valor={`${pessoas(evento.expected_audience)} pessoas`}
          apoio={`De ${pessoas(evento.min_audience)} a ${pessoas(evento.max_audience)}`}
        />
        <Numero
          icone={iconeItens}
          rotulo="Itens para cotar"
          valor={`${evento.items.length} ${evento.items.length === 1 ? 'item' : 'itens'}`}
          apoio={faltam > 0 ? `${faltam} sem proposta sua` : 'Você cotou todos'}
          destaque={faltam > 0}
        />
      </dl>
    </section>
  )
}

function Numero({ icone, rotulo, valor, apoio, destaque = false }) {
  return (
    <div
      className={`resumo-do-evento__numero${destaque ? ' resumo-do-evento__numero--destaque' : ''}`}
    >
      <span className="resumo-do-evento__icone">
        <Icone src={icone} />
      </span>
      <div>
        <dt>{rotulo}</dt>
        <dd>
          <strong>{valor}</strong>
          <small>{apoio}</small>
        </dd>
      </div>
    </div>
  )
}

const TRECHO_DA_SITUACAO = {
  sent: 'enviada',
  under_review: 'enviada',
  accepted: 'aceita',
  rejected: 'recusada',
  canceled: 'recusada',
  withdrawn: 'vazio',
}

function Andamento({ itens }) {
  const total = itens.length
  const enviadas = itens.filter(FILTROS.enviadas).length
  const quantos = (trecho) => itens.filter((item) => trechoDoItem(item) === trecho).length

  return (
    <div className="andamento-do-evento">
      <span>
        Você enviou {enviadas} de {total}
      </span>
      <span
        className="andamento-do-evento__barra"
        role="img"
        aria-label={`${quantos('aceita')} aceitas, ${quantos('enviada')} aguardando, ${quantos('recusada')} recusadas e ${quantos('vazio')} sem proposta`}
      >
        {itens.map((item) => (
          <span
            key={item.item_key}
            className={`andamento-do-evento__trecho andamento-do-evento__trecho--${trechoDoItem(item)}`}
          />
        ))}
      </span>
    </div>
  )
}

const trechoDoItem = (item) =>
  item.my_proposal ? TRECHO_DA_SITUACAO[item.my_proposal.status] : 'vazio'

function CartaoDoItem({ eventKey, item }) {
  const retirada = item.my_proposal?.status === 'withdrawn' ? item.my_proposal : null
  const proposta = retirada ? null : item.my_proposal
  const comparacao = proposta && comparacaoComPrevisto(proposta.amount, item.estimated_value)
  const rotaDoEnvio = `/fornecedor/eventos/${eventKey}/itens/${item.item_key}/propostas/etapa-1`

  return (
    <li className={`item-do-evento${proposta || item.decided ? '' : ' item-do-evento--pendente'}`}>
      <div className="item-do-evento__informacoes">
        <span className="fornecedor-evento__categorias">{item.category}</span>
        <h3>{item.description}</h3>
        <p className="item-do-evento__detalhes">
          <span>
            {item.type === 'product' ? 'Produto' : 'Serviço'} · {pessoas(item.quantity)}{' '}
            {item.quantity === 1 ? 'unidade' : 'unidades'}
          </span>
          {item.estimated_value != null && (
            <strong>Previsto {formatarMoeda(item.estimated_value)}</strong>
          )}
        </p>
        {item.notes && <ObservacaoDoOrganizador texto={item.notes} />}
      </div>

      <div className="item-do-evento__proposta">
        {proposta ? (
          <>
            <div className="item-do-evento__topo">
              <span>Sua proposta</span>
              <EtiquetaDaProposta status={proposta.status} />
            </div>
            <strong className="item-do-evento__valor">{formatarMoeda(proposta.amount)}</strong>
            {comparacao && (
              <small
                className={`item-do-evento__comparacao${proposta.amount > item.estimated_value ? ' item-do-evento__comparacao--acima' : ''}`}
              >
                {comparacao}
              </small>
            )}
            <Link to={`/fornecedor/propostas/${proposta.proposal_key}`} className="link-com-seta">
              Ver proposta
              <Icone src={iconeAvancar} />
            </Link>
          </>
        ) : item.decided ? (
          <>
            <span className="item-do-evento__rotulo">Item encerrado</span>
            <p>O organizador já escolheu uma proposta para este item.</p>
            {retirada && (
              <Link to={`/fornecedor/propostas/${retirada.proposal_key}`} className="link-com-seta">
                Ver proposta retirada
                <Icone src={iconeAvancar} />
              </Link>
            )}
          </>
        ) : retirada ? (
          <>
            <div className="item-do-evento__topo">
              <span>Sua proposta</span>
              <EtiquetaDaProposta status="withdrawn" />
            </div>
            <p>
              Você retirou esta proposta. Dá para enviar de novo enquanto o evento estiver em
              cotação.
            </p>
            <Link to={rotaDoEnvio} state={ENTRAR_NA_EDICAO} className="botao">
              Enviar de novo
            </Link>
            <Link to={`/fornecedor/propostas/${retirada.proposal_key}`} className="link-com-seta">
              Ver proposta retirada
              <Icone src={iconeAvancar} />
            </Link>
          </>
        ) : (
          <>
            <span className="item-do-evento__rotulo">Sua proposta</span>
            <p>Você ainda não enviou proposta para este item.</p>
            <Link to={rotaDoEnvio} state={ENTRAR_NA_EDICAO} className="botao">
              Enviar proposta
            </Link>
          </>
        )}
      </div>
    </li>
  )
}

function LocalEHorario({ evento }) {
  const dados = [
    ['Início', formatarDataEHora(evento.start_date)],
    ['Término', formatarDataEHora(evento.end_date)],
    ['Local', evento.venue_name],
    ['Endereço', evento.address],
    ['Cidade', `${evento.city}, ${evento.state}`],
  ]

  return (
    <section className="cartao">
      <div className="cartao__titulo">
        <h2>Local e horário</h2>
      </div>
      <dl className="linhas-de-dados linhas-de-dados--compactas">
        {dados.map(([rotulo, valor]) => (
          <div key={rotulo}>
            <dt>{rotulo}</dt>
            <dd>{valor}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

const PASSOS = [
  [iconeEnviar, 'Envie uma proposta por item, com valor, validade e condições.'],
  [iconeItens, 'Enquanto ela estiver Enviada, dá para editar ou retirar.'],
  [iconeFeito, 'O organizador escolhe uma proposta por item.'],
]

function ComoFunciona() {
  return (
    <section className="como-funciona" aria-label="Como funciona">
      <h2>Como funciona</h2>
      <ol>
        {PASSOS.map(([icone, texto]) => (
          <li key={texto}>
            <span className="como-funciona__icone">
              <Icone src={icone} />
            </span>
            {texto}
          </li>
        ))}
      </ol>
    </section>
  )
}
