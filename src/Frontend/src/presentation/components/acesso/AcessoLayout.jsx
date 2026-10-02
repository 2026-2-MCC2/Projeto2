import { Link } from 'react-router-dom'
import { BotaoAcessibilidade } from '../comum/BotaoAcessibilidade.jsx'
import { Logotipo } from '../comum/Logotipo.jsx'
import fotoShow from '../../assets/acesso/foto-show.jpg'
import '../../styles/acesso.css'

const CHAMADA_PADRAO = (
  <>
    Do orçamento ao
    <br />
    preço do ingresso.
  </>
)

const DESCRICAO_PADRAO =
  'Cadastre custos, receba propostas de fornecedores e calcule o ticket médio antes de abrir as vendas.'

export function AcessoLayout({
  foto = fotoShow,
  tom = 'laranja',
  fotoNoMobile = true,
  titulo = CHAMADA_PADRAO,
  descricao = DESCRICAO_PADRAO,
  children,
}) {
  return (
    <div className={`acesso${fotoNoMobile ? '' : ' acesso--marca-no-topo'}`}>
      <div className="acesso__formulario">
        <div className="acesso__conteudo">
          <div className="acesso__topo">
            <Link to="/" className="acesso__marca">
              <Logotipo className="acesso__logo" />
              <span className="acesso__selo">· Gestão</span>
            </Link>
          </div>

          <div className="acesso__miolo">{children}</div>
        </div>
      </div>

      <aside
        className={`acesso__painel acesso__painel--${tom}`}
        style={{ backgroundImage: `url(${foto})` }}
      >
        <div className="acesso__cor" />
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
