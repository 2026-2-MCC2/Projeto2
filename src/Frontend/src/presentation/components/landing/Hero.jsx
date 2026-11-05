import { Icone } from '../comum/Icone.jsx'
import { useEscalaParaCaber } from '../../hooks/useEscalaParaCaber.js'
import { BotaoLanding } from './BotaoLanding.jsx'
import { Ingresso } from './Ingresso.jsx'
import fotoShow from '../../assets/acesso/foto-show.jpg'
import iconeIngresso from '../../assets/landing/icone-ingresso.svg'
import iconeEscudo from '../../assets/landing/icone-escudo.svg'
import codigoDeBarras from '../../assets/landing/codigo-de-barras.svg'
import codigoDeBarrasPequeno from '../../assets/landing/codigo-de-barras-pequeno.svg'

// largura em que os ingressos foram desenhados no Figma; em telas menores eles encolhem juntos
const LARGURA_DOS_INGRESSOS = 660

const ETIQUETAS = [
  { chave: 'custo', nome: 'Custo total', valor: 'R$ 228.500' },
  { chave: 'margem', nome: 'Margem', valor: '20%' },
  { chave: 'equilibrio', nome: 'Equilíbrio', valor: '9.600 ingressos' },
]

const DADOS_DO_FESTIVAL = [
  { nome: 'DATA', valor: '18–20 Out 2026' },
  { nome: 'LOCAL', valor: 'Allianz Parque, SP' },
  { nome: 'SETOR', valor: 'Pista' },
]

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
          <BotaoLanding tipo="contorno-claro" para="/">
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
            <Ingresso
              className="hero__ingresso hero__ingresso--summit"
              canhoto={<Icone src={codigoDeBarrasPequeno} />}
            >
              <span className="hero__rotulo">TROCATICKET · INGRESSO</span>
              <strong className="hero__evento">Summit Corporativo Tech</strong>
            </Ingresso>

            <Ingresso
              className="hero__ingresso hero__ingresso--festival"
              canhoto={
                <>
                  <span className="hero__valor-rotulo">VALOR DO INGRESSO</span>
                  <strong className="hero__valor">R$ 23,80</strong>
                  <span className="hero__valor-apoio">calculado pelo TrocaTicket</span>
                  <Icone src={codigoDeBarras} />
                </>
              }
            >
              <span className="hero__rotulo hero__rotulo--pilula">TROCATICKET · INGRESSO</span>
              <strong className="hero__evento">Festival Primavera Som &amp; Luz 2026</strong>
              <dl className="hero__dados">
                {DADOS_DO_FESTIVAL.map((dado) => (
                  <div key={dado.nome}>
                    <dt>{dado.nome}</dt>
                    <dd>{dado.valor}</dd>
                  </div>
                ))}
              </dl>
            </Ingresso>
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
