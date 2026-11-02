import { useParams } from 'react-router-dom'
import { EventoLayout } from '../../components/organizador/EventoLayout.jsx'
import { Vazio } from '../../components/comum/EstadoDaTela.jsx'
import { Cartao } from '../../components/organizador/Cartao.jsx'
import { GraficoEquilibrio } from '../../components/organizador/GraficoEquilibrio.jsx'
import { useIsMobile } from '../../hooks/useIsMobile.js'
import { useEvento } from '../../hooks/useEvento.js'
import { Icone } from '../../components/comum/Icone.jsx'
import iconeAtencao from '../../assets/organizador/icone-atencao.svg'

export function EventoTicket() {
  const { id } = useParams()
  const isMobile = useIsMobile()
  const { evento } = useEvento(id)
  const calculo = evento?.detalhe?.calculo

  if (!calculo) {
    return (
      <EventoLayout>
        <Vazio
          titulo="Cálculo ainda indisponível"
          mensagem="O ticket é calculado quando o evento tiver custos cadastrados."
        />
      </EventoLayout>
    )
  }

  const precoLongo = (calculo.precoSugerido || '').length > 11

  const cenarios = (
    <Cartao titulo="Resultado por cenário de público">
      <p className="cartao__apoio cartao__apoio--acima">{calculo.apoioDosCenarios}</p>

      <div className="cenarios-grade">
        {calculo.cenarios.map((cenario) => {
          const resultadoLongo = (cenario.resultado || '').length > 11
          const receitaLonga = (cenario.receita || '').length > 11

          return (
            <article
              key={cenario.nome}
              className={`cenario-cartao${cenario.base ? ' cenario-cartao--base' : ''}`}
            >
              <div className="cenario-cartao__titulo">
                <strong>
                  {cenario.nome}
                  {isMobile && ` · ${cenario.publico}`}
                </strong>
                {cenario.etiqueta && (
                  <span className="etiqueta etiqueta--cotacao">
                    {isMobile ? 'base' : cenario.etiqueta}
                  </span>
                )}
              </div>

              {!isMobile && <span className="cenario-cartao__publico">{cenario.publico}</span>}

              <div className="cenario-cartao__numeros">
                <strong
                  className={`cenario-cartao__resultado${cenario.positivo ? '' : ' cenario-cartao__resultado--negativo'}${resultadoLongo ? ' cenario-cartao__resultado--compacto' : ''}`}
                >
                  {cenario.resultado}
                </strong>

                <div className="cenario-cartao__receita">
                  <span>{isMobile ? 'receita' : 'Receita'}</span>
                  <strong
                    className={receitaLonga ? 'cenario-cartao__receita--compacto' : undefined}
                  >
                    {cenario.receita}
                  </strong>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </Cartao>
  )

  const cenarioPessimista = calculo.cenarios[0]

  const precoSugerido = (
    <section className="cartao">
      <span className="cartao__rotulo">PREÇO SUGERIDO DO INGRESSO</span>
      <strong
        className={`ticket__valor ticket__valor--grande${precoLongo ? ' ticket__valor--compacto' : ''}`}
      >
        {calculo.precoSugerido}
      </strong>

      {calculo.resultado.map((dado) => {
        const valorLongo = (dado.valor || '').length > 15
        return (
          <div key={dado.rotulo} className="dado-linha">
            <span>{dado.rotulo}</span>
            <strong
              className={
                `${dado.positivo ? 'dado-linha__positivo ' : ''}${valorLongo ? 'dado-linha__valor--compacto' : ''}`.trim() ||
                undefined
              }
            >
              {dado.valor}
            </strong>
          </div>
        )
      })}

      <div className="cartao__divisor" />

      <p className="nota">
        <Icone src={iconeAtencao} />
        <span>
          Cobre o custo a partir de <strong>{calculo.equilibrio.ingressos}</strong>.
          {cenarioPessimista && (
            <>
              {' '}
              No cenário pessimista ({cenarioPessimista.publico}),{' '}
              {cenarioPessimista.positivo ? (
                <>
                  o resultado estimado é de <strong>{cenarioPessimista.resultado}</strong>.
                </>
              ) : (
                <>
                  faltam <strong>{cenarioPessimista.resultado.replace(/^[+-]/, '')}</strong>.
                </>
              )}
            </>
          )}
        </span>
      </p>
    </section>
  )

  const premissas = (
    <Cartao titulo="Premissas do cálculo">
      <p className="formula">{calculo.formula}</p>

      {calculo.premissas.map((premissa) => {
        const valorLongo = (premissa.valor || '').length > 15
        return (
          <div key={premissa.rotulo} className="dado-linha">
            <span>{premissa.rotulo}</span>
            <strong className={valorLongo ? 'dado-linha__valor--compacto' : undefined}>
              {premissa.valor}
            </strong>
          </div>
        )
      })}
    </Cartao>
  )

  const grafico = (
    <Cartao titulo="A partir de quantos ingressos o evento se paga">
      <div className="equilibrio">
        <p className="cartao__apoio">{calculo.equilibrio.explicacao}</p>

        <div className="equilibrio__destaque">
          <span>PONTO DE EQUILÍBRIO</span>
          <strong>{calculo.equilibrio.ingressos}</strong>
        </div>
      </div>

      <div className="grafico__legenda">
        <span className="grafico__legenda-item grafico__legenda-item--receita">
          Receita com ingressos
        </span>
        <span className="grafico__legenda-item grafico__legenda-item--custo">
          Custo total do evento
        </span>
      </div>

      <GraficoEquilibrio equilibrio={calculo.equilibrio} />
    </Cartao>
  )

  if (isMobile) {
    return (
      <EventoLayout>
        {precoSugerido}
        {cenarios}
        {grafico}
        {premissas}
      </EventoLayout>
    )
  }

  return (
    <EventoLayout>
      <div className="colunas">
        <div className="colunas__principal">
          {cenarios}
          {grafico}
        </div>

        <div className="colunas__lateral colunas__lateral--estreita">
          {precoSugerido}
          {premissas}
        </div>
      </div>
    </EventoLayout>
  )
}
