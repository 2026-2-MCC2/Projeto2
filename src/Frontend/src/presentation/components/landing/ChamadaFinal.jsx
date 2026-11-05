import { Icone } from '../comum/Icone.jsx'
import { BotaoLanding } from './BotaoLanding.jsx'
import { Ingresso } from './Ingresso.jsx'
import codigoDeBarras from '../../assets/landing/codigo-de-barras-claro.svg'

// ingresso horizontal no desktop e vertical no mobile (canhoto embaixo)
export function ChamadaFinal() {
  return (
    <section className="chamada-landing" aria-labelledby="chamada-titulo">
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
              Nº 001
            </strong>
            <Icone src={codigoDeBarras} className="chamada-landing__barras" />
            <span className="chamada-landing__aviso">Acesso liberado após aprovação</span>
          </>
        }
      >
        <p className="chamada-landing__sobretitulo">TROCATICKET · INGRESSO DE ACESSO</p>
        <h2 id="chamada-titulo" className="chamada-landing__titulo">
          Cada show começa com uma planilha.
        </h2>
        <p className="chamada-landing__subtitulo">
          Cadastre-se e descubra o preço justo do ingresso antes de abrir as vendas.
        </p>
        <div className="chamada-landing__acoes">
          <BotaoLanding para="/cadastro">Criar cadastro</BotaoLanding>
          <BotaoLanding tipo="secundario" para="/entrar">
            Entrar na plataforma
          </BotaoLanding>
        </div>
      </Ingresso>
    </section>
  )
}
