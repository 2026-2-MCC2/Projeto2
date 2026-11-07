import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { EventoLayout } from '../../components/organizador/EventoLayout.jsx'
import { Carregando, ErroNaTela, Vazio } from '../../components/comum/EstadoDaTela.jsx'
import { Tabela } from '../../components/organizador/Tabela.jsx'
import { Botao } from '../../components/organizador/Formulario.jsx'
import { ModalNovoItem } from '../../components/organizador/ModalNovoItem.jsx'
import { ModalCustoProprio } from '../../components/organizador/ModalCustoProprio.jsx'
import { ModalItemDeCotacao } from '../../components/organizador/ModalItemDeCotacao.jsx'
import {
  eventoPodeSerEditado,
  formatarMoeda,
  listarItensDeCotacao,
} from '../../../application/eventos.js'
import { useIsMobile } from '../../hooks/useIsMobile.js'
import { useEvento } from '../../hooks/useEvento.js'
import { Icone } from '../../components/comum/Icone.jsx'
import iconeAdicionar from '../../assets/organizador/icone-adicionar-claro.svg'

// qualquer proposta, inclusive retirada, trava o item (apagar levaria a proposta e a conversa junto)
const itemTravado = (item) => Boolean(item.locked) || Number(item.proposals_count) > 0
const resumoDasPropostas = (item) =>
  Number(item.proposals_count) === 0 && item.locked
    ? 'proposta retirada'
    : `${item.proposals_count} proposta(s)`

export function EventoItens() {
  const { id } = useParams()
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const [adicionando, setAdicionando] = useState(false)
  const [custoEmEdicao, setCustoEmEdicao] = useState(null)
  const [itemEmEdicao, setItemEmEdicao] = useState(null)
  const [tentativa, setTentativa] = useState(0)
  const [resultadoItens, setResultadoItens] = useState({ chave: null, itens: [], erro: null })
  const { evento } = useEvento(id)
  const chaveDaBusca = `${id}:${tentativa}`
  const carregandoItens = resultadoItens.chave !== chaveDaBusca
  const itensDeCotacao = carregandoItens ? [] : resultadoItens.itens
  const erroItens = carregandoItens ? null : resultadoItens.erro
  const custos = evento?.detalhe?.custos
  const podeEditar = eventoPodeSerEditado(evento)
  const abrirCusto = (chave) =>
    podeEditar && setCustoEmEdicao(custos?.linhas.find((linha) => linha.chave === chave))

  useEffect(() => {
    let telaAberta = true
    listarItensDeCotacao(id)
      .then((itens) => {
        if (telaAberta) setResultadoItens({ chave: chaveDaBusca, itens, erro: null })
      })
      .catch((falha) => {
        if (telaAberta) setResultadoItens({ chave: chaveDaBusca, itens: [], erro: falha })
      })

    return () => {
      telaAberta = false
    }
  }, [id, tentativa, chaveDaBusca])

  const recarregarItens = () => setTentativa((atual) => atual + 1)
  const abrirItemDeCotacao = (item) => {
    if (item && podeEditar && !itemTravado(item)) setItemEmEdicao(item)
  }

  const modalDoCusto = custoEmEdicao && (
    <ModalCustoProprio
      eventKey={id}
      nomeDoEvento={evento.detalhe.nomeCompleto}
      custo={custoEmEdicao}
      aoFechar={() => setCustoEmEdicao(null)}
    />
  )

  const modalDoItem = itemEmEdicao && (
    <ModalItemDeCotacao
      eventKey={id}
      evento={evento.detalhe.nomeCompleto}
      item={itemEmEdicao}
      aoFechar={() => setItemEmEdicao(null)}
      aoSalvar={() => {
        setItemEmEdicao(null)
        recarregarItens()
      }}
    />
  )

  const estadoDosItens = erroItens ? (
    <ErroNaTela erro={erroItens} aoTentarDeNovo={recarregarItens} />
  ) : carregandoItens ? (
    <Carregando mensagem="Carregando itens para cotação…" />
  ) : null

  const itensMobile = itensDeCotacao.map((item) => ({
    chave: item.item_key,
    nome: item.description,
    categoria: `${item.category}${itemTravado(item) ? ` · ${resumoDasPropostas(item)}, edição bloqueada` : ''}`,
    valor: item.accepted_proposal
      ? formatarMoeda(item.accepted_proposal.amount)
      : item.estimated_value == null
        ? 'A definir'
        : formatarMoeda(item.estimated_value),
    bloqueado: itemTravado(item),
  }))

  if (isMobile) {
    const proprios = custos?.linhas ?? []

    return (
      <EventoLayout>
        {custos && (
          <div className="destaque-total">
            <span>Custos próprios do evento</span>
            <strong>{custos.totalProprios}</strong>
            <small>{custos.resumoMobile}</small>
          </div>
        )}

        <button
          type="button"
          className="botao botao--largo"
          disabled={!podeEditar}
          onClick={() =>
            navigate(`/organizador/eventos/${id}/itens/novo`, { viewTransition: true })
          }
        >
          <Icone src={iconeAdicionar} />
          Adicionar item de custo
        </button>

        {estadoDosItens}
        <GrupoDeItens
          titulo="ITENS PARA COTAÇÃO"
          itens={itensMobile}
          aoEscolher={(itemKey) =>
            abrirItemDeCotacao(itensDeCotacao.find((item) => item.item_key === itemKey))
          }
          podeEditar={podeEditar}
        />
        <GrupoDeItens
          titulo="CUSTOS PRÓPRIOS"
          itens={proprios}
          aoEscolher={abrirCusto}
          podeEditar={podeEditar}
        />
        {!carregandoItens && !erroItens && itensMobile.length === 0 && proprios.length === 0 && (
          <Vazio
            titulo="Nenhum item de custo ainda"
            mensagem="Adicione um item para cotação ou um custo próprio."
          />
        )}
        {modalDoCusto}
        {modalDoItem}
      </EventoLayout>
    )
  }

  return (
    <EventoLayout
      acoes={
        <Botao type="button" disabled={!podeEditar} onClick={() => setAdicionando(true)}>
          Adicionar item
        </Botao>
      }
    >
      <div className="indicadores-cartao">
        {(custos?.indicadores ?? []).map((indicador) => (
          <div key={indicador.nome} className="indicador-cartao">
            <span>{indicador.nome}</span>
            <strong>{indicador.valor}</strong>
          </div>
        ))}
      </div>

      {estadoDosItens}

      {itensDeCotacao.length > 0 && (
        <section className="painel">
          <div className="painel__titulo">
            <h2>Itens para cotação</h2>
            <p>Os fornecedores poderão enviar propostas para estes itens.</p>
          </div>
          <Tabela
            colunas={['ITEM', 'CATEGORIA', 'TIPO / PROPOSTAS', 'VALOR']}
            linhas={itensDeCotacao.map((item) => ({
              chave: item.item_key,
              bloqueada: itemTravado(item),
              celulas: [
                item.description,
                item.category,
                `${item.type === 'product' ? 'Produto' : 'Serviço'} · ${resumoDasPropostas(item)}${itemTravado(item) ? ' · edição bloqueada' : ''}`,
                item.accepted_proposal
                  ? formatarMoeda(item.accepted_proposal.amount)
                  : item.estimated_value == null
                    ? 'A definir'
                    : formatarMoeda(item.estimated_value),
              ],
            }))}
            acaoDaLinha="Editar o item"
            aoClicarNaLinha={
              podeEditar
                ? (itemKey) =>
                    abrirItemDeCotacao(itensDeCotacao.find((item) => item.item_key === itemKey))
                : undefined
            }
          />
        </section>
      )}

      {custos?.linhas.length > 0 ? (
        <Tabela
          colunas={['ITEM', 'CATEGORIA', 'ORIGEM', 'VALOR']}
          linhas={custos.linhas.map((linha) => ({
            chave: linha.chave,
            celulas: [linha.nome, linha.categoria, linha.origem, linha.valor],
          }))}
          rodape={['Total de custos próprios', '', '', custos.totalProprios]}
          acaoDaLinha="Editar o custo"
          aoClicarNaLinha={podeEditar ? abrirCusto : undefined}
        />
      ) : !carregandoItens && !erroItens && itensDeCotacao.length === 0 ? (
        <Vazio
          titulo="Nenhum item de custo ainda"
          mensagem="Adicione um item para cotação ou um custo próprio."
        />
      ) : null}

      {modalDoCusto}

      {adicionando && (
        <ModalNovoItem
          eventKey={id}
          evento={evento.detalhe.nomeCompleto}
          aoFechar={() => setAdicionando(false)}
          aoSalvar={recarregarItens}
        />
      )}
      {modalDoItem}
    </EventoLayout>
  )
}

function GrupoDeItens({ titulo, itens, aoEscolher, podeEditar = true }) {
  return (
    <section className="grupo">
      <h2 className="grupo__titulo">{titulo}</h2>

      {itens.map((item) => (
        <button
          key={item.chave ?? item.nome}
          type="button"
          className="grupo__item"
          disabled={!aoEscolher || item.bloqueado || !podeEditar}
          onClick={() => aoEscolher?.(item.chave)}
        >
          <div>
            <strong>{item.nome}</strong>
            <small>{item.categoria}</small>
          </div>
          <strong className="grupo__valor">{item.valor}</strong>
        </button>
      ))}
    </section>
  )
}
