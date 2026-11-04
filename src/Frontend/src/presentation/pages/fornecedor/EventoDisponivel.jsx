// Detalhes seguros de um evento aberto para cotação pelo fornecedor.

import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { buscarEventoDisponivel } from '../../../application/eventosDisponiveis.js'
import { formatarMoeda, formatarPeriodo } from '../../../application/eventos.js'
import { Carregando, ErroNaTela, Vazio } from '../../components/comum/EstadoDaTela.jsx'
import { OrganizadorLayout } from '../../components/organizador/OrganizadorLayout.jsx'
import '../../styles/fornecedor.css'

export function EventoDisponivel() {
  const { id } = useParams()
  const [tentativa, setTentativa] = useState(0)
  const [resultado, setResultado] = useState({ chave: null, evento: null, erro: null })
  const carregando = resultado.chave !== id

  useEffect(() => {
    let telaAberta = true
    buscarEventoDisponivel(id)
      .then((evento) => {
        if (telaAberta) setResultado({ chave: id, evento, erro: null })
      })
      .catch((erro) => {
        if (telaAberta) setResultado({ chave: id, evento: null, erro })
      })

    return () => {
      telaAberta = false
    }
  }, [id, tentativa])

  const evento = carregando ? null : resultado.evento
  const titulo = carregando ? 'Carregando evento…' : (evento?.name ?? 'Evento indisponível')
  const voltarPara = '/fornecedor/eventos'

  return (
    <OrganizadorLayout perfil="fornecedor" titulo={titulo} voltarPara={voltarPara}>
      {carregando ? (
        <Carregando mensagem="Carregando os itens disponíveis…" />
      ) : resultado.erro ? (
        resultado.erro.status === 404 ? (
          <Vazio
            titulo="Este evento não está disponível"
            mensagem="Ele pode ter sido encerrado ou não ter itens nas suas categorias."
          />
        ) : (
          <ErroNaTela
            erro={resultado.erro}
            aoTentarDeNovo={() => setTentativa((valor) => valor + 1)}
          />
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
                      {item.my_proposal && (
                        <small>
                          Sua proposta: {item.my_proposal.status} ·{' '}
                          {formatarMoeda(item.my_proposal.amount)}
                        </small>
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
