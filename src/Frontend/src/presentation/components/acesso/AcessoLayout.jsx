import { Link } from 'react-router-dom'
import { useAbaVisivel } from '../../hooks/useAbaVisivel.js'
import { BotaoAcessibilidade } from '../comum/BotaoAcessibilidade.jsx'
import { Logotipo } from '../comum/Logotipo.jsx'
import { TituloDaPagina } from '../comum/TituloDaPagina.jsx'
import { PularParaConteudo } from '../comum/PularParaConteudo.jsx'
import fotoShow from '../../assets/acesso/foto-show.jpg'
import '../../styles/acesso.css'

const CHAMADA_PADRAO = (
  <>
    Do orçamento ao
    <br />
    <span className="texto-em-gradiente">preço do ingresso.</span>
  </>
)

// feixes de luz que passam pela foto, abaixo do véu
const FEIXES = [1, 2, 3]

const DESCRICAO_PADRAO =
  'Cadastre custos, receba propostas de fornecedores e calcule o ticket médio antes de abrir as vendas.'

export function AcessoLayout({
  tituloDaPagina,
  foto = fotoShow,
  tom = 'laranja',
  fotoNoMobile = true,
  titulo = CHAMADA_PADRAO,
  descricao = DESCRICAO_PADRAO,
  children,
}) {
  const abaVisivel = useAbaVisivel()

  return (
    <div className={`acesso${fotoNoMobile ? '' : ' acesso--marca-no-topo'}`}>
      <TituloDaPagina titulo={tituloDaPagina} />
      <PularParaConteudo />
      <main id="conteudo" tabIndex={-1} className="acesso__formulario">
        <div className="acesso__conteudo">
          <div className="acesso__topo">
            <Link to="/" className="acesso__marca">
              <Logotipo className="acesso__logo" />
              <span className="acesso__selo">· Gestão</span>
            </Link>
          </div>

          <div className="acesso__miolo">{children}</div>
        </div>
      </main>

      <aside
        className={`acesso__painel acesso__painel--${tom}${abaVisivel ? '' : ' acesso__painel--pausado'}`}
      >
        <div
          className="acesso__foto"
          style={{ backgroundImage: `url(${foto})` }}
          aria-hidden="true"
        />
        <div className="acesso__cor" />
        {FEIXES.map((feixe) => (
          <span
            key={feixe}
            className={`acesso__feixe acesso__feixe--${feixe}`}
            aria-hidden="true"
          />
        ))}
        <div className="acesso__veu" />
        <div className="acesso__chamada">
          <h2>{titulo}</h2>
          <p>{descricao}</p>
        </div>
      </aside>

      <BotaoAcessibilidade />
    </div>
  )
}
