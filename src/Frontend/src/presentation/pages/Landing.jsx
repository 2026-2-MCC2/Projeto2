import { BotaoAcessibilidade } from '../components/comum/BotaoAcessibilidade.jsx'
import { PularParaConteudo } from '../components/comum/PularParaConteudo.jsx'
import { TituloDaPagina } from '../components/comum/TituloDaPagina.jsx'
import { Ingresso } from '../components/landing/Ingresso.jsx'
import { NavbarLanding } from '../components/landing/NavbarLanding.jsx'
import '../styles/landing.css'

// TEMPORÁRIO: as três referências do Figma (passo 607-528, cenário 607-538, chamada 609-416)
function DemonstracaoDoIngresso() {
  return (
    <section className="demo-ingresso">
      <h2>Ingresso · vitrine temporária</h2>

      <div className="demo-ingresso__linha">
        <Ingresso
          orientacao="vertical"
          canhotoNoInicio
          className="demo-ingresso__passo"
          canhoto={
            <div className="demo-ingresso__etapa">
              <span>ETAPA</span>
              <strong>01</strong>
            </div>
          }
        >
          <div className="demo-ingresso__texto">
            <strong>Cadastre o evento</strong>
            <span>Comece pelo período, local e público esperado.</span>
          </div>
        </Ingresso>

        <div className="demo-ingresso__painel">
          <Ingresso
            orientacao="vertical"
            className="demo-ingresso__cenario"
            canhoto={<strong className="demo-ingresso__valor">+ R$ 57.100</strong>}
          >
            <div className="demo-ingresso__texto">
              <strong>Realista</strong>
              <span>12.000 pessoas</span>
            </div>
          </Ingresso>
        </div>
      </div>

      <div className="demo-ingresso__fundo-escuro">
        <Ingresso
          orientacao="responsiva"
          className="demo-ingresso__chamada"
          canhoto={
            <div className="demo-ingresso__entrada">
              <span>ENTRADA</span>
              <strong>Nº 001</strong>
            </div>
          }
        >
          <div className="demo-ingresso__texto demo-ingresso__texto--grande">
            <strong>Cada show começa com uma planilha.</strong>
            <span>Horizontal no desktop; abaixo de 900px o canhoto desce.</span>
          </div>
        </Ingresso>
      </div>
    </section>
  )
}

// Página pública de apresentação. Os ids das seções são as âncoras do menu e do rodapé.
// As seções entram uma a uma; por enquanto só a estrutura.
export function Landing() {
  return (
    <div className="landing">
      <TituloDaPagina titulo="Planejamento e precificação de eventos" />
      <PularParaConteudo />

      <NavbarLanding />

      <main id="conteudo" tabIndex={-1}>
        {/* TEMPORÁRIO: vitrine do componente Ingresso, sai quando as seções entrarem */}
        <DemonstracaoDoIngresso />

        <section className="landing__secao landing__hero">{/* hero */}</section>

        <section id="como-funciona" className="landing__secao">
          {/* como funciona */}
        </section>

        <section className="landing__secao landing__perfis">
          <article id="organizadores">{/* perfil organizador */}</article>
          <article id="fornecedores">{/* perfil fornecedor */}</article>
        </section>

        <section id="calculo-do-ticket" className="landing__secao">
          {/* cálculo do ticket */}
        </section>

        <section id="duvidas" className="landing__secao">
          {/* dúvidas frequentes */}
        </section>

        <section className="landing__secao landing__chamada">{/* chamada final */}</section>
      </main>

      <footer className="landing__rodape">{/* rodapé */}</footer>

      <BotaoAcessibilidade />
    </div>
  )
}
