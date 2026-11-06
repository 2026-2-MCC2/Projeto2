import { useRef } from 'react'
import { formatarMoeda } from '../../../domain/formatacao.js'
import { Icone } from '../comum/Icone.jsx'
import { EVENTO_DE_EXEMPLO as evento, NUMEROS_DO_EXEMPLO } from '../../data/eventoDeExemplo.js'
import { useEscalaParaCaber } from '../../hooks/useEscalaParaCaber.js'
import { useTilt } from '../../hooks/useTilt.js'
import { BotaoLanding } from './BotaoLanding.jsx'
import { Ingresso } from './Ingresso.jsx'
import fotoShow from '../../assets/acesso/foto-show.jpg'
import iconeIngresso from '../../assets/landing/icone-ingresso.svg'
import iconeEscudo from '../../assets/landing/icone-escudo.svg'
import codigoDeBarras from '../../assets/landing/codigo-de-barras.svg'
import codigoDeBarrasPequeno from '../../assets/landing/codigo-de-barras-pequeno.svg'
import { ROTA_DO_LOGIN } from '../../../application/sessao.js'

// largura em que os ingressos foram desenhados no Figma; em telas menores eles encolhem juntos
const LARGURA_DOS_INGRESSOS = 660

const ETIQUETAS = [
  { chave: 'custo', nome: 'Custo total', valor: NUMEROS_DO_EXEMPLO.custoTotal },
  { chave: 'margem', nome: 'Margem', valor: NUMEROS_DO_EXEMPLO.margem },
  { chave: 'equilibrio', nome: 'Equilíbrio', valor: NUMEROS_DO_EXEMPLO.equilibrio },
]

const DADOS_DO_FESTIVAL = [
  { nome: 'DATA', valor: '18–20 Out 2026' },
  { nome: 'LOCAL', valor: 'Allianz Parque, SP' },
  { nome: 'SETOR', valor: 'Pista' },
]

// uma camada por efeito, para um transform não apagar o outro:
// posição + rotação + entrada → flutuar → tilt do mouse → o ingresso em si.
// O mouse é medido na camada que flutua (ela não inclina, então a caixa não treme);
// as variáveis do tilt descem por herança.
function IngressoDoHero({ variante, canhoto, children }) {
  const camadaDoMouse = useRef(null)
  useTilt(camadaDoMouse)

  return (
    <div className={`hero__ingresso hero__ingresso--${variante}`}>
      <div className="ingresso-flutua" ref={camadaDoMouse}>
        <div className="ingresso-tilt">
          <Ingresso canhoto={canhoto}>{children}</Ingresso>
        </div>
      </div>
    </div>
  )
}

export function Hero() {
  const [caixaDosIngressos, escala] = useEscalaParaCaber(LARGURA_DOS_INGRESSOS)

  return (
    <section className="hero" aria-labelledby="hero-titulo">
      <div className="hero__fundo" aria-hidden="true">
        <img src={fotoShow} alt="" className="hero__foto" fetchPriority="high" />
      </div>

      <div className="hero__chamada">
        <p className="hero__selo">
          <Icone src={iconeIngresso} />
          Planejamento, cotação e precificação de eventos
        </p>

        <h1 id="hero-titulo" className="hero__titulo">
          Do orçamento ao <span className="hero__destaque">preço do ingresso.</span>
        </h1>

        <p className="hero__subtitulo">
          Cadastre os custos do seu evento, receba propostas de fornecedores e descubra o preço
          justo do ingresso antes de abrir as vendas.
        </p>

        <div className="hero__acoes">
          <BotaoLanding para="/cadastro">Criar cadastro</BotaoLanding>
          <BotaoLanding tipo="contorno-claro" para={ROTA_DO_LOGIN}>
            Já tenho conta
          </BotaoLanding>
        </div>

        <p className="hero__aviso">
          <Icone src={iconeEscudo} />
          Cadastros passam por aprovação do administrador antes do primeiro acesso.
        </p>
      </div>

      {/* ilustração com valores de exemplo: fica fora do leitor de tela */}
      <div className="hero__visual" aria-hidden="true">
        <div className="hero__ingressos" ref={caixaDosIngressos}>
          <div className="hero__palco" style={{ '--escala': escala }}>
            <IngressoDoHero variante="summit" canhoto={<Icone src={codigoDeBarrasPequeno} />}>
              <span className="hero__rotulo">TROCATICKET · INGRESSO</span>
              <strong className="hero__evento">Summit Corporativo Tech</strong>
            </IngressoDoHero>

            <IngressoDoHero
              variante="festival"
              canhoto={
                <>
                  <span className="hero__valor-rotulo">VALOR DO INGRESSO</span>
                  <strong className="hero__valor">{formatarMoeda(evento.precoSugerido)}</strong>
                  <span className="hero__valor-apoio">calculado pelo TrocaTicket</span>
                  <Icone src={codigoDeBarras} />
                </>
              }
            >
              <span className="hero__rotulo hero__rotulo--pilula">TROCATICKET · INGRESSO</span>
              <strong className="hero__evento">{evento.nome}</strong>
              <dl className="hero__dados">
                {DADOS_DO_FESTIVAL.map((dado) => (
                  <div key={dado.nome}>
                    <dt>{dado.nome}</dt>
                    <dd>{dado.valor}</dd>
                  </div>
                ))}
              </dl>
            </IngressoDoHero>
          </div>
        </div>

        <ul className="hero__etiquetas">
          {ETIQUETAS.map((etiqueta) => (
            <li key={etiqueta.chave} className={`hero__etiqueta hero__etiqueta--${etiqueta.chave}`}>
              {etiqueta.nome}
              <strong>{etiqueta.valor}</strong>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
