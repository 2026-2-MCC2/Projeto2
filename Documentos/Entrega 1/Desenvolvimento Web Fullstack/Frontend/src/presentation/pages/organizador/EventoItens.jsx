import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { EventoLayout } from '../../components/organizador/EventoLayout.jsx'
import { Tabela } from '../../components/organizador/Tabela.jsx'
import { Botao } from '../../components/organizador/Formulario.jsx'
import { ModalNovoItem } from '../../components/organizador/ModalNovoItem.jsx'
import { useIsMobile } from '../../hooks/useIsMobile.js'
import { buscarEvento } from '../../data/eventos.js'
import iconeAdicionar from '../../assets/organizador/icone-adicionar-claro.svg'

export function EventoItens() {
  const { id } = useParams()
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const [adicionando, setAdicionando] = useState(false)
  const evento = buscarEvento(id)
  const custos = evento?.detalhe?.custos

  if (!custos) return <EventoLayout />

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
          <img src={iconeAdicionar} alt="" />
          Adicionar item de custo
        </button>

        <GrupoDeItens titulo="CONTRATADO DE FORNECEDORES" itens={deFornecedores} />
        <GrupoDeItens titulo="CUSTOS PRÓPRIOS" itens={proprios} />
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
        linhas={custos.linhas.map((linha) => [
          linha.nome,
          linha.categoria,
          linha.origem,
          linha.valor,
        ])}
        rodape={['Total', '', '', custos.total]}
      />

      {adicionando && (
        <ModalNovoItem
          evento={evento.detalhe.nomeCompleto}
          aoFechar={() => setAdicionando(false)}
        />
      )}
    </EventoLayout>
  )
}

function GrupoDeItens({ titulo, itens }) {
  return (
    <section className="grupo">
      <h2 className="grupo__titulo">{titulo}</h2>

      {itens.map((item) => (
        <div key={item.nome} className="grupo__item">
          <div>
            <strong>{item.nome}</strong>
            <small>{item.categoria}</small>
          </div>
          <strong className="grupo__valor">{item.valor}</strong>
        </div>
      ))}
    </section>
  )
}
