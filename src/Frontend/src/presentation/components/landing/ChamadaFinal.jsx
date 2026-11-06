import { useRef } from 'react'
import { useMouseOuFoco } from '../../hooks/useMouseOuFoco.js'
import { useNaTela } from '../../hooks/useNaTela.js'
import { Icone } from '../comum/Icone.jsx'
import { BotaoLanding } from './BotaoLanding.jsx'
import { Ingresso } from './Ingresso.jsx'
import codigoDeBarras from '../../assets/landing/codigo-de-barras-claro.svg'
import { ROTA_DO_LOGIN } from '../../../application/sessao.js'

// último dígito do "Nº 001": dá uma volta inteira e para no 1, como um contador mecânico
const ROLO_DO_NUMERO = [...'012345678901']

// manchas de luz do fundo, na ordem de pintura: a última fica por cima
const MANCHAS = ['laranja', 'rosa', 'azul']

// ingresso horizontal no desktop e vertical no mobile (canhoto embaixo)
export function ChamadaFinal() {
  // o ingresso começa escondido só pela classe --animar, que vem daqui: sem JS aparece normal
  const secao = useRef(null)
  const naTela = useNaTela(secao)
  // as manchas do fundo só se movem com a seção na tela, para poupar bateria
  const auroraNaTela = useNaTela(secao, { limiar: 0, umaVez: false })
  // o canhoto começa a se destacar com o mouse ou o foco de teclado no botão principal
  const [destacando, eventosDoBotao] = useMouseOuFoco()

  const classes = [
    'chamada-landing chamada-landing--animar',
    naTela && 'chamada-landing--visivel',
    auroraNaTela && 'chamada-landing--aurora',
    destacando && 'chamada-landing--destacando',
  ]

  return (
    <section
      ref={secao}
      className={classes.filter(Boolean).join(' ')}
      aria-labelledby="chamada-titulo"
    >
      {MANCHAS.map((mancha) => (
        <span
          key={mancha}
          className={`chamada-landing__mancha chamada-landing__mancha--${mancha}`}
          aria-hidden="true"
        />
      ))}

      <Ingresso
        orientacao="responsiva"
        className="chamada-landing__ingresso"
        canhoto={
          <>
            {/* "ENTRADA Nº 001" e o código de barras são decoração do ingresso */}
            <span className="chamada-landing__entrada" aria-hidden="true">
              ENTRADA
            </span>
            <strong className="chamada-landing__numero" aria-hidden="true">
              Nº 00
              <span className="chamada-landing__digito">
                1
                <span className="chamada-landing__rolo">
                  {ROLO_DO_NUMERO.map((digito, indice) => (
                    <span key={indice}>{digito}</span>
                  ))}
                </span>
              </span>
            </strong>
            <Icone src={codigoDeBarras} className="chamada-landing__barras" />
            <span className="chamada-landing__aviso">Acesso liberado após aprovação</span>
            <span className="chamada-landing__carimbo" aria-hidden="true">
              VÁLIDO
            </span>
          </>
        }
      >
        {/* --i é a posição na fila da entrada; o conteúdo do canhoto é o último (4, no CSS) */}
        <p className="chamada-landing__sobretitulo" style={{ '--i': 0 }}>
          TROCATICKET · INGRESSO DE ACESSO
        </p>
        <h2 id="chamada-titulo" className="chamada-landing__titulo" style={{ '--i': 1 }}>
          Cada show começa com uma planilha.
        </h2>
        <p className="chamada-landing__subtitulo" style={{ '--i': 2 }}>
          Cadastre-se e descubra o preço justo do ingresso antes de abrir as vendas.
        </p>
        <div className="chamada-landing__acoes" style={{ '--i': 3 }}>
          <BotaoLanding para="/cadastro" {...eventosDoBotao}>
            Criar cadastro
          </BotaoLanding>
          <BotaoLanding tipo="secundario" para={ROTA_DO_LOGIN}>
            Entrar na plataforma
          </BotaoLanding>
        </div>
      </Ingresso>
    </section>
  )
}
