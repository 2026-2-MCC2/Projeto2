import { useNavigate, useParams } from 'react-router-dom'
import { EventoLayout } from '../../components/organizador/EventoLayout.jsx'
import { Tabela } from '../../components/organizador/Tabela.jsx'
import { Botao } from '../../components/organizador/Formulario.jsx'
import { useIsMobile } from '../../hooks/useIsMobile.js'
import { buscarEvento } from '../../data/eventos.js'

export function EventoPropostas() {
  const { id } = useParams()
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const comparacao = buscarEvento(id)?.detalhe?.comparacao

  if (!comparacao) return <EventoLayout />

  return (
    <EventoLayout>
      <div className="comparacao">
        {comparacao.propostas.map((proposta) => (
          <article
            key={proposta.fornecedor}
            className={`proposta${proposta.recomendada ? ' proposta--recomendada' : ''}`}
          >
            {proposta.etiqueta && <span className="etiqueta etiqueta--aprovado">{proposta.etiqueta}</span>}

            <div className="proposta__cabecalho">
              <strong className="proposta__fornecedor">{proposta.fornecedor}</strong>
              <strong className="proposta__valor">{proposta.valor}</strong>
            </div>

            <div className="proposta__dados">
              <div>
                <span>Prazo de entrega</span>
                <strong>{proposta.prazo}</strong>
              </div>
              <div>
                <span>{isMobile ? 'Validade' : 'Validade da proposta'}</span>
                <strong>{proposta.validade}</strong>
              </div>
            </div>

            <Botao type="button" secundario={!proposta.recomendada} onClick={() => navigate(`/organizador/eventos/${id}/propostas/${comparacao.recebida.id}`)}>
              {proposta.recomendada || isMobile ? 'Selecionar proposta' : 'Selecionar'}
            </Botao>
          </article>
        ))}
      </div>

      {!isMobile && (
        <Tabela
          colunas={['OUTROS ITENS EM COTAÇÃO', 'PROPOSTAS', 'MENOR VALOR', 'SITUAÇÃO']}
          linhas={comparacao.outrosItens.map((item) => [item.nome, item.propostas, item.menorValor, item.situacao])}
        />
      )}

    </EventoLayout>
  )
}
