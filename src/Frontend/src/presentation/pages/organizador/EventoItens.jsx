import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { EventoLayout } from '../../components/organizador/EventoLayout.jsx'
import { Vazio } from '../../components/comum/EstadoDaTela.jsx'
import { Tabela } from '../../components/organizador/Tabela.jsx'
import { Botao } from '../../components/organizador/Formulario.jsx'
import { ModalNovoItem } from '../../components/organizador/ModalNovoItem.jsx'
import { ModalCustoProprio } from '../../components/organizador/ModalCustoProprio.jsx'
import { eventoPodeSerEditado } from '../../../application/eventos.js'
import { useIsMobile } from '../../hooks/useIsMobile.js'
import { useEvento } from '../../hooks/useEvento.js'
import { Icone } from '../../components/comum/Icone.jsx'
import iconeAdicionar from '../../assets/organizador/icone-adicionar-claro.svg'

export function EventoItens() {
  const { id } = useParams()
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const [adicionando, setAdicionando] = useState(false)
  const [custoEmEdicao, setCustoEmEdicao] = useState(null)
  const { evento } = useEvento(id)
  const custos = evento?.detalhe?.custos
  const podeEditar = eventoPodeSerEditado(evento)
  const abrirCusto = (chave) =>
    podeEditar && setCustoEmEdicao(custos.linhas.find((linha) => linha.chave === chave))

  const modalDoCusto = custoEmEdicao && (
    <ModalCustoProprio
      eventKey={id}
      nomeDoEvento={evento.detalhe.nomeCompleto}
      custo={custoEmEdicao}
      aoFechar={() => setCustoEmEdicao(null)}
    />
  )

  if (!custos) {
    return (
      <EventoLayout>
        <Vazio
          titulo="Nenhum item de custo ainda"
          mensagem="Os itens de custo do evento aparecem aqui assim que forem cadastrados."
        />
      </EventoLayout>
    )
  }

  if (isMobile) {
    const deFornecedores = custos.linhas.filter((linha) => linha.origem !== 'Custo próprio')
    const proprios = custos.linhas.filter((linha) => linha.origem === 'Custo próprio')

    return (
      <EventoLayout>
        <div className="destaque-total">
          <span>Custo total do evento</span>
          <strong>{custos.total}</strong>
          <small>{custos.resumoMobile}</small>
        </div>

        <button
          type="button"
          className="botao botao--largo"
          onClick={() =>
            navigate(`/organizador/eventos/${id}/itens/novo`, { viewTransition: true })
          }
        >
          <Icone src={iconeAdicionar} />
          Adicionar item de custo
        </button>

        <GrupoDeItens titulo="CONTRATADO DE FORNECEDORES" itens={deFornecedores} />
        <GrupoDeItens titulo="CUSTOS PRÓPRIOS" itens={proprios} aoEscolher={abrirCusto} />
        {modalDoCusto}
      </EventoLayout>
    )
  }

  return (
    <EventoLayout
      acoes={
        <Botao type="button" onClick={() => setAdicionando(true)}>
          Adicionar item
        </Botao>
      }
    >
      <div className="indicadores-cartao">
        {custos.indicadores.map((indicador) => (
          <div key={indicador.nome} className="indicador-cartao">
            <span>{indicador.nome}</span>
            <strong>{indicador.valor}</strong>
          </div>
        ))}
      </div>

      <Tabela
        colunas={['ITEM', 'CATEGORIA', 'ORIGEM', 'VALOR']}
        linhas={custos.linhas.map((linha) => ({
          chave: linha.chave,
          celulas: [linha.nome, linha.categoria, linha.origem, linha.valor],
        }))}
        rodape={['Total', '', '', custos.total]}
        aoClicarNaLinha={podeEditar ? abrirCusto : undefined}
      />

      {modalDoCusto}

      {adicionando && (
        <ModalNovoItem
          eventKey={id}
          evento={evento.detalhe.nomeCompleto}
          aoFechar={() => setAdicionando(false)}
        />
      )}
    </EventoLayout>
  )
}

function GrupoDeItens({ titulo, itens, aoEscolher }) {
  return (
    <section className="grupo">
      <h2 className="grupo__titulo">{titulo}</h2>

      {itens.map((item) => (
        <button
          key={item.chave ?? item.nome}
          type="button"
          className="grupo__item"
          disabled={!aoEscolher}
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
