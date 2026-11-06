import { useEffect, useRef, useState } from 'react'
import { formatarMoeda, formatarMoedaSemCentavos } from '../../../domain/formatacao.js'
import { calcularTicket } from '../../../utils/calcularTicket.js'
import { EVENTO_DE_EXEMPLO as evento, VALORES_DO_EXEMPLO } from '../../data/eventoDeExemplo.js'
import { useApareceuNaTela } from '../../hooks/useApareceuNaTela.js'
import { useNumerosAnimados } from '../../hooks/useNumerosAnimados.js'
import { pulsar, semMovimento } from '../../movimento.js'
import { CabecalhoDaSecao } from './CabecalhoDaSecao.jsx'
import { Ingresso } from './Ingresso.jsx'

const numero = (valor) => valor.toLocaleString('pt-BR')

// "− R$ 38.100" / "+ R$ 57.100": sinal sempre visível, com o menos tipográfico
const resultado = (valor) => `${valor < 0 ? '−' : '+'} ${formatarMoedaSemCentavos(Math.abs(valor))}`

// a margem fica em % inteiro nos controles; o range para em 99%, então nunca chega a 100%
const VALORES_INICIAIS = {
  custoTotal: VALORES_DO_EXEMPLO.custoTotal,
  margem: Math.round(VALORES_DO_EXEMPLO.margem * 100),
  publico: VALORES_DO_EXEMPLO.publico,
}

const calcularDosControles = (valores) =>
  calcularTicket({ ...valores, margem: valores.margem / 100 })

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
    maximo: 99,
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

// durante o arraste o preço muda a cada passo do slider: o destaque não repete antes disso
const INTERVALO_ENTRE_DESTAQUES_DO_PRECO = 400

// troca a cor quando o cenário vira lucro ou prejuízo, com um pulse (menos na contagem de entrada)
// `valorFinal` (sem animação) decide o tamanho da fonte, para ela não mudar a cada quadro do tween
function ResultadoDoCenario({ valor, valorFinal, pulsarNaTroca }) {
  const elemento = useRef(null)
  const tipo = valor < 0 ? 'prejuizo' : 'lucro'
  const tipoAnterior = useRef(tipo)

  useEffect(() => {
    if (tipoAnterior.current === tipo) return
    tipoAnterior.current = tipo
    if (pulsarNaTroca) pulsar(elemento.current)
  }, [tipo, pulsarNaTroca])

  return (
    <strong
      ref={elemento}
      className={`cenario-landing__resultado cenario-landing__resultado--${tipo}`}
      style={{ '--caracteres': resultado(valorFinal).length }}
    >
      {resultado(valor)}
    </strong>
  )
}

export function CalculoDoTicket() {
  const [valores, setValores] = useState(VALORES_INICIAIS)
  const calculo = calcularDosControles(valores)
  const { pessimista, realista, otimista } = calculo.cenarios
  const acimaDoOtimista = calculo.equilibrio > otimista.publico

  // os números contam quando 30% da seção aparece; com menos movimento já começam no valor certo
  const secao = useRef(null)
  const ativo = useApareceuNaTela(secao, 0.3) || semMovimento()
  const [naTela, contando] = useNumerosAnimados(
    {
      custoTotal: valores.custoTotal,
      preco: calculo.preco,
      equilibrio: calculo.equilibrio,
      pessimista: pessimista.resultado,
      realista: realista.resultado,
      otimista: otimista.resultado,
    },
    { ativo },
  )
  const equilibrioNaTela = numero(Math.round(naTela.equilibrio))

  // o destaque do preço sai do próprio evento que muda os valores (timeStamp em ms, como o rAF)
  const preco = useRef(null)
  const ultimoDestaque = useRef(-Infinity)
  const destacarPreco = (novosValores, instante) => {
    if (calcularDosControles(novosValores).preco === calculo.preco) return
    if (instante - ultimoDestaque.current < INTERVALO_ENTRE_DESTAQUES_DO_PRECO) return
    ultimoDestaque.current = instante
    pulsar(preco.current, { escala: 1.04, duracao: 300 })
  }

  const mudarValores = (novosValores, evento) => {
    setValores(novosValores)
    destacarPreco(novosValores, evento.timeStamp)
  }

  const mudar = (chave) => (evento) =>
    mudarValores({ ...valores, [chave]: Number(evento.target.value) }, evento)

  return (
    <section
      ref={secao}
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
            // na contagem de entrada o valor escrito conta junto; depois acompanha o slider direto
            const valorNaTela = contando && chave in naTela ? Math.round(naTela[chave]) : valor
            const id = `calculo-landing-${chave}`

            return (
              <div key={chave} className="calculo-landing__controle">
                <dt>
                  <label htmlFor={id}>{nome}</label>
                </dt>
                <dd>
                  {/* o leitor de tela já ouve o valor pelo aria-valuetext do range */}
                  <span className="calculo-landing__valor" aria-hidden="true">
                    {formatar(valorNaTela)}
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
            <dd>{equilibrioNaTela} ingressos</dd>
          </div>
        </dl>

        <button
          type="button"
          className="calculo-landing__restaurar"
          onClick={(evento) => mudarValores(VALORES_INICIAIS, evento)}
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
            <strong ref={preco}>{formatarMoeda(naTela.preco)}</strong>
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
                  <ResultadoDoCenario
                    valor={Math.round(naTela[chave])}
                    valorFinal={cenario.resultado}
                    pulsarNaTroca={!contando}
                  />
                }
              >
                <span className="cenario-landing__nome">{nome}</span>
                <span className="cenario-landing__publico">{numero(cenario.publico)} pessoas</span>
              </Ingresso>
            )
          })}
        </ul>

        <div
          className={`calculo-landing__equilibrio${acimaDoOtimista ? ' calculo-landing__equilibrio--acima' : ''}`}
        >
          <p className="calculo-landing__rotulos">
            <span>Ingressos vendidos para pagar o evento</span>
            <strong>
              {equilibrioNaTela} de {numero(otimista.publico)}
            </strong>
          </p>
          {/* a barra repete o número escrito acima: fica fora do leitor de tela.
              Começa vazia, enche em 1s quando a seção aparece e depois acompanha os sliders */}
          <div
            className={`calculo-landing__barra${ativo && !contando ? ' calculo-landing__barra--acompanha' : ''}`}
            aria-hidden="true"
          >
            <span style={{ '--progresso': `${ativo ? calculo.barraPercentual : 0}%` }} />
          </div>
          {acimaDoOtimista && (
            <p className="calculo-landing__alerta">Equilíbrio acima do cenário otimista</p>
          )}
        </div>
      </div>
    </section>
  )
}
