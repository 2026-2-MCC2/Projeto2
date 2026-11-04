// Detalhes seguros de um evento aberto para cotação pelo fornecedor.

import { Link, useParams } from 'react-router-dom'
import { formatarMoeda, formatarPeriodo } from '../../../application/eventos.js'
import { traduzirStatusDaProposta } from '../../../application/propostas.js'
import { Carregando, ErroNaTela, Vazio } from '../../components/comum/EstadoDaTela.jsx'
import { OrganizadorLayout } from '../../components/organizador/OrganizadorLayout.jsx'
import { useEventoDisponivel } from '../../hooks/useEventoDisponivel.js'
import '../../styles/fornecedor.css'

export function EventoDisponivel() {
  const { id } = useParams()
  const { carregando, evento, erro, tentarDeNovo } = useEventoDisponivel(id)
  const titulo = carregando ? 'Carregando evento…' : (evento?.name ?? 'Evento indisponível')
  const voltarPara = '/fornecedor/eventos'

  return (
    <OrganizadorLayout perfil="fornecedor" titulo={titulo} voltarPara={voltarPara}>
      {carregando ? (
        <Carregando mensagem="Carregando os itens disponíveis…" />
      ) : erro ? (
        erro.status === 404 ? (
          <Vazio
            titulo="Este evento não está disponível"
            mensagem="Ele pode ter sido encerrado ou não ter itens nas suas categorias."
          />
        ) : (
          <ErroNaTela erro={erro} aoTentarDeNovo={tentarDeNovo} />
        )
      ) : (
        <div className="fornecedor-evento-detalhe">
          <section className="painel" aria-labelledby="evento-dados-titulo">
            <div className="painel__titulo">
              <h2 id="evento-dados-titulo">Sobre o evento</h2>
              <p>{evento.description}</p>
            </div>
            <dl className="fornecedor-evento-detalhe__dados">
              <div>
                <dt>Data</dt>
                <dd>{formatarPeriodo(evento.start_date, evento.end_date)}</dd>
              </div>
              <div>
                <dt>Local</dt>
                <dd>
                  {evento.venue_name}, {evento.address}, {evento.city} — {evento.state}
                </dd>
              </div>
              <div>
                <dt>Público esperado</dt>
                <dd>{Number(evento.expected_audience).toLocaleString('pt-BR')}</dd>
              </div>
            </dl>
          </section>

          <section className="painel" aria-labelledby="itens-evento-titulo">
            <div className="painel__titulo">
              <h2 id="itens-evento-titulo">Itens nas suas categorias</h2>
              <p>Estes são os itens disponíveis para receber propostas.</p>
            </div>
            {evento.items.length === 0 ? (
              <Vazio titulo="Nenhum item disponível" />
            ) : (
              <div className="fornecedor-evento-detalhe__itens">
                {evento.items.map((item) => (
                  <article key={item.item_key} className="fornecedor-evento-detalhe__item">
                    <div>
                      <span className="fornecedor-evento__categorias">{item.category}</span>
                      <h3>{item.description}</h3>
                      <p>
                        {item.type === 'product' ? 'Produto' : 'Serviço'} · Quantidade:{' '}
                        {item.quantity}
                      </p>
                      {item.notes && <p>{item.notes}</p>}
                    </div>
                    <div className="fornecedor-evento-detalhe__valor">
                      <span>Valor previsto</span>
                      <strong>
                        {item.estimated_value == null
                          ? 'Não informado'
                          : formatarMoeda(item.estimated_value)}
                      </strong>
                      {item.my_proposal ? (
                        <>
                          <small>
                            Sua proposta: {traduzirStatusDaProposta(item.my_proposal.status)} ·{' '}
                            {formatarMoeda(item.my_proposal.amount)}
                          </small>
                          <Link to="/fornecedor/propostas" className="botao botao--secundario">
                            Ver proposta
                          </Link>
                        </>
                      ) : (
                        <Link
                          to={`/fornecedor/eventos/${id}/itens/${item.item_key}/propostas/etapa-1`}
                          className="botao"
                        >
                          Enviar proposta
                        </Link>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </OrganizadorLayout>
  )
}
