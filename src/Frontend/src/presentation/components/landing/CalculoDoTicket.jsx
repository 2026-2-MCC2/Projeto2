import { useEffect, useMemo, useRef, useState } from 'react'
import {
  formatarInteiro as numero,
  formatarMoeda,
  formatarMoedaSemCentavos,
  formatarResultado as resultado,
} from '../../../domain/formatacao.js'
import { calcularTicket } from '../../../utils/calcularTicket.js'
import { EVENTO_DE_EXEMPLO as evento, VALORES_DO_EXEMPLO } from '../../data/eventoDeExemplo.js'
import { useNaTela } from '../../hooks/useNaTela.js'
import { pulsar, semMovimento } from '../../movimento.js'
import { CabecalhoDaSecao } from './CabecalhoDaSecao.jsx'
import { Ingresso } from './Ingresso.jsx'
import { NumeroAnimado } from './NumeroAnimado.jsx'

// no meio da animação os números têm casas decimais: o resultado arredonda antes do sinal, para
// −0,3 virar "+ R$ 0" e não "− R$ 0" (o numero já arredonda sozinho)
const resultadoAnimado = (valor) => resultado(Math.round(valor))

// contagem de entrada (quando a seção aparece) e tween de cada mudança depois dela
const DURACAO_DA_ENTRADA = 1200
const DURACAO_DA_TROCA = 300

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
    // o custo conta junto com os resultados na entrada; depois acompanha o slider direto
    contaNaEntrada: true,
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

// troca a cor quando o cenário vira lucro ou prejuízo, com um pulse (menos na contagem de entrada).
// A cor e o tamanho da fonte seguem o valor final, não o animado: não mudam a cada quadro
function ResultadoDoCenario({ valor, duracao, pulsarNaTroca }) {
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
      style={{ '--caracteres': resultado(valor).length }}
    >
      <NumeroAnimado valor={valor} formato={resultadoAnimado} duracao={duracao} />
    </strong>
  )
}

export function CalculoDoTicket() {
  // só os 3 sliders ficam em estado; o resto é derivado deles
  const [valores, setValores] = useState(VALORES_INICIAIS)
  const calculo = useMemo(() => calcularDosControles(valores), [valores])
  const { otimista } = calculo.cenarios
  const acimaDoOtimista = calculo.equilibrio > otimista.publico

  // os números ficam em 0 até 30% da seção aparecer e então contam até o valor;
  // com menos movimento já começam no valor certo
  const secao = useRef(null)
  const ativo = useNaTela(secao) || semMovimento()
  const [entradaTerminou, setEntradaTerminou] = useState(false)
  useEffect(() => {
    if (!ativo) return
    const espera = setTimeout(() => setEntradaTerminou(true), DURACAO_DA_ENTRADA)
    return () => clearTimeout(espera)
  }, [ativo])
  const contando = ativo && !entradaTerminou
  const duracao = contando ? DURACAO_DA_ENTRADA : DURACAO_DA_TROCA
  const alvo = (valor) => (ativo ? valor : 0)

  const equilibrio = (
    <NumeroAnimado valor={alvo(calculo.equilibrio)} formato={numero} duracao={duracao} />
  )

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
          {CONTROLES.map(({ chave, nome, minimo, maximo, passo, formatar, contaNaEntrada }) => {
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
                    {contaNaEntrada ? (
                      <NumeroAnimado
                        valor={alvo(valor)}
                        formato={formatar}
                        duracao={contando ? DURACAO_DA_ENTRADA : 0}
                      />
                    ) : (
                      formatar(valor)
                    )}
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
            <dd>{equilibrio} ingressos</dd>
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
            <strong ref={preco}>
              <NumeroAnimado
                valor={alvo(calculo.preco)}
                formato={formatarMoeda}
                duracao={duracao}
              />
            </strong>
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
                    valor={alvo(cenario.resultado)}
                    duracao={duracao}
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
              {equilibrio} de {numero(otimista.publico)}
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
