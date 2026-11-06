import { useState } from 'react'
import { formatarMoeda, formatarMoedaSemCentavos } from '../../../domain/formatacao.js'
import { calcularTicket } from '../../../utils/calcularTicket.js'
import { EVENTO_DE_EXEMPLO as evento, VALORES_DO_EXEMPLO } from '../../data/eventoDeExemplo.js'
import { CabecalhoDaSecao } from './CabecalhoDaSecao.jsx'
import { Ingresso } from './Ingresso.jsx'

const numero = (valor) => valor.toLocaleString('pt-BR')

// "− R$ 38.100" / "+ R$ 57.100": sinal sempre visível, com o menos tipográfico
const resultado = (valor) => `${valor < 0 ? '−' : '+'} ${formatarMoedaSemCentavos(Math.abs(valor))}`

// a margem fica em % inteiro nos controles; o range para em 60%, então nunca chega a 100%
const VALORES_INICIAIS = {
  custoTotal: VALORES_DO_EXEMPLO.custoTotal,
  margem: Math.round(VALORES_DO_EXEMPLO.margem * 100),
  publico: VALORES_DO_EXEMPLO.publico,
}

const CONTROLES = [
  {
    chave: 'custoTotal',
    nome: 'Custo total',
    minimo: 20000,
    maximo: 1000000,
    passo: 500,
    formatar: formatarMoedaSemCentavos,
  },
  {
    chave: 'margem',
    nome: 'Margem de lucro',
    minimo: 0,
    maximo: 60,
    passo: 1,
    formatar: (valor) => `${valor}%`,
  },
  {
    chave: 'publico',
    nome: 'Público esperado',
    minimo: 500,
    maximo: 60000,
    passo: 100,
    formatar: (valor) => `${numero(valor)} pessoas`,
  },
]

const CENARIOS = [
  { chave: 'pessimista', nome: 'Pessimista' },
  { chave: 'realista', nome: 'Realista', referencia: true },
  { chave: 'otimista', nome: 'Otimista' },
]

export function CalculoDoTicket() {
  const [valores, setValores] = useState(VALORES_INICIAIS)
  const calculo = calcularTicket({ ...valores, margem: valores.margem / 100 })
  const { otimista } = calculo.cenarios

  const mudar = (chave) => (evento) =>
    setValores((atuais) => ({ ...atuais, [chave]: Number(evento.target.value) }))

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
          {CONTROLES.map(({ chave, nome, minimo, maximo, passo, formatar }) => {
            const valor = valores[chave]
            const id = `calculo-landing-${chave}`

            return (
              <div key={chave} className="calculo-landing__controle">
                <dt>
                  <label htmlFor={id}>{nome}</label>
                </dt>
                <dd>
                  {/* o leitor de tela já ouve o valor pelo aria-valuetext do range */}
                  <span className="calculo-landing__valor" aria-hidden="true">
                    {formatar(valor)}
                  </span>
                  <input
                    type="range"
                    id={id}
                    className="calculo-landing__range"
                    min={minimo}
                    max={maximo}
                    step={passo}
                    value={valor}
                    onChange={mudar(chave)}
                    aria-valuetext={formatar(valor)}
                    style={{
                      '--preenchimento': `${((valor - minimo) / (maximo - minimo)) * 100}%`,
                    }}
                  />
                </dd>
              </div>
            )
          })}

          <div>
            <dt>Ponto de equilíbrio</dt>
            <dd>{numero(calculo.equilibrio)} ingressos</dd>
          </div>
        </dl>

        <button
          type="button"
          className="calculo-landing__restaurar"
          onClick={() => setValores(VALORES_INICIAIS)}
        >
          Restaurar exemplo
        </button>
      </div>

      <div className="calculo-landing__painel">
        <div className="calculo-landing__topo">
          <div>
            <h3 className="calculo-landing__evento">{evento.nome}</h3>
            <p className="calculo-landing__apoio">Resultado por cenário de público</p>
          </div>
          <p className="calculo-landing__preco">
            <span>PREÇO SUGERIDO</span>
            <strong>{formatarMoeda(calculo.preco)}</strong>
          </p>
        </div>

        <ul className="calculo-landing__cenarios">
          {CENARIOS.map(({ chave, nome, referencia }) => {
            const cenario = calculo.cenarios[chave]

            return (
              <Ingresso
                key={chave}
                elemento="li"
                orientacao="vertical"
                className={`cenario-landing${referencia ? ' cenario-landing--referencia' : ''}`}
                canhoto={
                  <strong
                    className={`cenario-landing__resultado cenario-landing__resultado--${cenario.resultado < 0 ? 'prejuizo' : 'lucro'}`}
                  >
                    {resultado(cenario.resultado)}
                  </strong>
                }
              >
                <span className="cenario-landing__nome">{nome}</span>
                <span className="cenario-landing__publico">{numero(cenario.publico)} pessoas</span>
              </Ingresso>
            )
          })}
        </ul>

        <div className="calculo-landing__equilibrio">
          <p className="calculo-landing__rotulos">
            <span>Ingressos vendidos para pagar o evento</span>
            <strong>
              {numero(calculo.equilibrio)} de {numero(otimista.publico)}
            </strong>
          </p>
          {/* a barra repete o número escrito acima: fica fora do leitor de tela */}
          <div className="calculo-landing__barra" aria-hidden="true">
            <span style={{ width: `${calculo.barraPercentual}%` }} />
          </div>
        </div>
      </div>
    </section>
  )
}
