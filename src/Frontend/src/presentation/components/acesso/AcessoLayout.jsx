import { Link } from 'react-router-dom'
import { useAbaVisivel } from '../../hooks/useAbaVisivel.js'
import { BotaoAcessibilidade } from '../comum/BotaoAcessibilidade.jsx'
import { Logotipo } from '../comum/Logotipo.jsx'
import { TituloDaPagina } from '../comum/TituloDaPagina.jsx'
import { PularParaConteudo } from '../comum/PularParaConteudo.jsx'
import fotoShow from '../../assets/acesso/foto-show.jpg'
import '../../styles/acesso.css'

const INICIO_DA_CHAMADA = 'Do orçamento ao'
const DESTAQUE_DA_CHAMADA = 'preço do ingresso.'

const CHAMADA_PADRAO = (
  <>
    {INICIO_DA_CHAMADA}
    <br />
    <span className="texto-em-gradiente">{DESTAQUE_DA_CHAMADA}</span>
  </>
)

// feixes de luz que passam pela foto, abaixo do véu
const FEIXES = [1, 2, 3]

const DESCRICAO_PADRAO =
  'Cadastre custos, receba propostas de fornecedores e calcule o ticket médio antes de abrir as vendas.'

// uma palavra da entrada do painel; --p é a posição dela na fila
function Palavra({ ordem, children }) {
  return (
    <>
      <span className="acesso__palavra" style={{ '--p': ordem }}>
        {children}
      </span>{' '}
    </>
  )
}

const palavras = (texto, primeira) =>
  texto.split(' ').map((palavra, indice) => (
    <Palavra key={indice} ordem={primeira + indice}>
      {palavra}
    </Palavra>
  ))

// O leitor de tela ouve a frase inteira no .so-leitor; as palavras animadas ficam fora dele.
// O destaque entra como um bloco: background-clip: text não atravessa filhos animados
function ChamadaEmPalavras({ descricao }) {
  const noInicio = INICIO_DA_CHAMADA.split(' ').length

  return (
    <div className="acesso__chamada">
      <h2>
        <span className="so-leitor">{`${INICIO_DA_CHAMADA} ${DESTAQUE_DA_CHAMADA}`}</span>
        <span aria-hidden="true">
          {palavras(INICIO_DA_CHAMADA, 0)}
          <br />
          <Palavra ordem={noInicio}>
            <span className="texto-em-gradiente">{DESTAQUE_DA_CHAMADA}</span>
          </Palavra>
        </span>
      </h2>
      <p>
        <span className="so-leitor">{descricao}</span>
        <span aria-hidden="true">{palavras(descricao, noInicio + 1)}</span>
      </p>
    </div>
  )
}

export function AcessoLayout({
  tituloDaPagina,
  foto = fotoShow,
  tom = 'laranja',
  fotoNoMobile = true,
  titulo = CHAMADA_PADRAO,
  descricao = DESCRICAO_PADRAO,
  entrada = false,
  children,
}) {
  const abaVisivel = useAbaVisivel()

  return (
    <div
      className={`acesso${fotoNoMobile ? '' : ' acesso--marca-no-topo'}${entrada ? ' acesso--animar' : ''}`}
    >
      <TituloDaPagina titulo={tituloDaPagina} />
      <PularParaConteudo />
      <main id="conteudo" tabIndex={-1} className="acesso__formulario">
        <div className="acesso__conteudo">
          <div className="acesso__topo">
            <Link to="/" className="acesso__marca acesso__entra">
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
        {entrada ? (
          <ChamadaEmPalavras descricao={descricao} />
        ) : (
          <div className="acesso__chamada">
            <h2>{titulo}</h2>
            <p>{descricao}</p>
          </div>
        )}
      </aside>

      <BotaoAcessibilidade />
    </div>
  )
}
