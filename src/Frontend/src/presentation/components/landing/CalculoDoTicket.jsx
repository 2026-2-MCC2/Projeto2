import { formatarMoeda, formatarMoedaSemCentavos } from '../../../domain/formatacao.js'
import { EVENTO_DE_EXEMPLO as evento } from '../../data/eventoDeExemplo.js'
import { CabecalhoDaSecao } from './CabecalhoDaSecao.jsx'
import { Ingresso } from './Ingresso.jsx'

const numero = (valor) => valor.toLocaleString('pt-BR')

// "− R$ 38.100" / "+ R$ 57.100": sinal sempre visível, com o menos tipográfico
const resultado = (valor) => `${valor < 0 ? '−' : '+'} ${formatarMoedaSemCentavos(Math.abs(valor))}`

const PREMISSAS = [
  { nome: 'Custo total', valor: formatarMoedaSemCentavos(evento.custoTotal) },
  { nome: 'Margem de lucro', valor: `${Math.round(evento.margem * 100)}%` },
  { nome: 'Ponto de equilíbrio', valor: `${numero(evento.pontoDeEquilibrio)} ingressos` },
]

export function CalculoDoTicket() {
  const vendidosParaPagar = (evento.pontoDeEquilibrio / evento.publicoMaximo) * 100

  return (
    <section
      id="calculo-do-ticket"
      className="landing__secao calculo-landing"
      aria-labelledby="calculo-do-ticket-titulo"
    >
      <div className="calculo-landing__texto">
        <CabecalhoDaSecao
          id="calculo-do-ticket-titulo"
          alinhamento="esquerda"
          sobretitulo="CÁLCULO DO TICKET"
          titulo="O preço justo do ingresso, antes de abrir as vendas"
          subtitulo="Com os custos consolidados, você vê quanto cobrar, quantos ingressos precisa vender e quanto sobra em cada cenário."
        />

        <p className="calculo-landing__formula">Ticket = Custo total ÷ [Público × (1 − Margem)]</p>

        <dl className="calculo-landing__premissas">
          {PREMISSAS.map((premissa) => (
            <div key={premissa.nome}>
              <dt>{premissa.nome}</dt>
              <dd>{premissa.valor}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="calculo-landing__painel">
        <div className="calculo-landing__topo">
          <div>
            <h3 className="calculo-landing__evento">{evento.nome}</h3>
            <p className="calculo-landing__apoio">Resultado por cenário de público</p>
          </div>
          <p className="calculo-landing__preco">
            <span>PREÇO SUGERIDO</span>
            <strong>{formatarMoeda(evento.precoSugerido)}</strong>
          </p>
        </div>

        <ul className="calculo-landing__cenarios">
          {evento.cenarios.map((cenario) => (
            <Ingresso
              key={cenario.nome}
              elemento="li"
              orientacao="vertical"
              className={`cenario-landing${cenario.referencia ? ' cenario-landing--referencia' : ''}`}
              canhoto={
                <strong
                  className={`cenario-landing__resultado cenario-landing__resultado--${cenario.resultado < 0 ? 'prejuizo' : 'lucro'}`}
                >
                  {resultado(cenario.resultado)}
                </strong>
              }
            >
              <span className="cenario-landing__nome">{cenario.nome}</span>
              <span className="cenario-landing__publico">{numero(cenario.publico)} pessoas</span>
            </Ingresso>
          ))}
        </ul>

        <div className="calculo-landing__equilibrio">
          <p className="calculo-landing__rotulos">
            <span>Ingressos vendidos para pagar o evento</span>
            <strong>
              {numero(evento.pontoDeEquilibrio)} de {numero(evento.publicoMaximo)}
            </strong>
          </p>
          {/* a barra repete o "9.600 de 15.000" escrito acima: fica fora do leitor de tela */}
          <div className="calculo-landing__barra" aria-hidden="true">
            <span style={{ width: `${vendidosParaPagar}%` }} />
          </div>
        </div>
      </div>
    </section>
  )
}
