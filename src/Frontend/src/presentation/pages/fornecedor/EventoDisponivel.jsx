// Evento aberto para cotação visto pelo fornecedor: os itens das suas categorias e os dados do evento.

import { Link, useParams } from 'react-router-dom'
import { formatarDataEHora, formatarMoeda, formatarPeriodo } from '../../../application/eventos.js'
import { Carregando, ErroNaTela, Vazio } from '../../components/comum/EstadoDaTela.jsx'
import { Icone } from '../../components/comum/Icone.jsx'
import { TituloDaPagina } from '../../components/comum/TituloDaPagina.jsx'
import { EtiquetaDaProposta } from '../../components/fornecedor/EtiquetaDaProposta.jsx'
import { Cartao } from '../../components/organizador/Cartao.jsx'
import { OrganizadorLayout } from '../../components/organizador/OrganizadorLayout.jsx'
import { useEventoDisponivel } from '../../hooks/useEventoDisponivel.js'
import { useIsMobile } from '../../hooks/useIsMobile.js'
import { ENTRAR_NA_EDICAO } from '../../hooks/usePropostaEmEdicao.js'
import iconeVoltar from '../../assets/organizador/icone-voltar.svg'
import '../../styles/fornecedor.css'

const LISTA_DE_EVENTOS = '/fornecedor/eventos'
const pessoas = (quantidade) => Number(quantidade).toLocaleString('pt-BR')

export function EventoDisponivel() {
  const { id } = useParams()
  const isMobile = useIsMobile()
  const { carregando, evento, erro, tentarDeNovo } = useEventoDisponivel(id)

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

  const resumo = `${formatarPeriodo(evento.start_date, evento.end_date)} · ${evento.venue_name}, ${evento.city} — ${evento.state} · ${pessoas(evento.expected_audience)} pessoas esperadas`
  const conteudo = (
    <div className="colunas">
      <div className="colunas__principal">
        <ItensParaCotar eventKey={id} itens={evento.items} />
      </div>
      <aside className="colunas__lateral">
        <SobreOEvento evento={evento} />
      </aside>
    </div>
  )

  if (isMobile) {
    return (
      <OrganizadorLayout
        perfil="fornecedor"
        titulo={evento.name}
        apoio={resumo}
        voltarPara={LISTA_DE_EVENTOS}
      >
        {conteudo}
      </OrganizadorLayout>
    )
  }

  return (
    <OrganizadorLayout perfil="fornecedor">
      <TituloDaPagina titulo={evento.name} />
      <div className="evento-topo">
        <div className="evento-topo__titulos">
          <Link to={LISTA_DE_EVENTOS} className="evento-topo__voltar" viewTransition>
            <Icone src={iconeVoltar} />
            Eventos disponíveis
          </Link>
          <div className="evento-topo__nome">
            <h1>{evento.name}</h1>
            <span className="etiqueta etiqueta--cotacao">Em cotação</span>
          </div>
          <p className="evento-topo__resumo">{resumo}</p>
        </div>
      </div>
      {conteudo}
    </OrganizadorLayout>
  )
}

function ItensParaCotar({ eventKey, itens }) {
  const comProposta = itens.filter((item) => item.my_proposal).length

  return (
    <Cartao titulo="Itens para cotar">
      {itens.length === 0 ? (
        <Vazio icone="eventos" titulo="Nenhum item nas suas categorias" />
      ) : (
        <>
          <p className="itens-para-cotar__progresso">
            Você enviou proposta para {comProposta} de {itens.length}{' '}
            {itens.length === 1 ? 'item' : 'itens'}.
          </p>
          <ul className="itens-para-cotar">
            {itens.map((item) => (
              <ItemParaCotar key={item.item_key} eventKey={eventKey} item={item} />
            ))}
          </ul>
        </>
      )}
    </Cartao>
  )
}

function ItemParaCotar({ eventKey, item }) {
  const proposta = item.my_proposal

  return (
    <li className="item-para-cotar">
      <div className="item-para-cotar__texto">
        <span className="fornecedor-evento__categorias">{item.category}</span>
        <h3>{item.description}</h3>
        <p>
          {item.type === 'product' ? 'Produto' : 'Serviço'} · Quantidade: {pessoas(item.quantity)}
          {item.estimated_value != null &&
            ` · Valor previsto: ${formatarMoeda(item.estimated_value)}`}
        </p>
        {item.notes && <p className="item-para-cotar__observacao">{item.notes}</p>}
      </div>

      <div className="item-para-cotar__acao">
        {proposta ? (
          <>
            <div className="item-para-cotar__proposta">
              <EtiquetaDaProposta status={proposta.status} />
              <strong>{formatarMoeda(proposta.amount)}</strong>
            </div>
            <Link
              to={`/fornecedor/propostas/${proposta.proposal_key}`}
              className="botao botao--secundario"
            >
              Ver proposta
            </Link>
          </>
        ) : (
          <Link
            to={`/fornecedor/eventos/${eventKey}/itens/${item.item_key}/propostas/etapa-1`}
            state={ENTRAR_NA_EDICAO}
            className="botao"
          >
            Enviar proposta
          </Link>
        )}
      </div>
    </li>
  )
}

function SobreOEvento({ evento }) {
  const dados = [
    { rotulo: 'CATEGORIA', valor: evento.category },
    { rotulo: 'INÍCIO', valor: formatarDataEHora(evento.start_date) },
    { rotulo: 'TÉRMINO', valor: formatarDataEHora(evento.end_date) },
    {
      rotulo: 'PÚBLICO (MÍN · ESPERADO · MÁX)',
      valor: [evento.min_audience, evento.expected_audience, evento.max_audience]
        .map(pessoas)
        .join(' · '),
    },
    {
      rotulo: 'LOCAL',
      valor: `${evento.venue_name} — ${evento.address}, ${evento.city} — ${evento.state}`,
    },
  ]

  return (
    <Cartao titulo="Sobre o evento">
      {evento.description && <p className="sobre-o-evento__descricao">{evento.description}</p>}
      <div className="ficha ficha--empilhada">
        {dados.map((dado) => (
          <div key={dado.rotulo} className="ficha__dado">
            <span>{dado.rotulo}</span>
            <strong>{dado.valor}</strong>
          </div>
        ))}
      </div>
    </Cartao>
  )
}
