import { BotaoAcessibilidade } from '../components/comum/BotaoAcessibilidade.jsx'
import { PularParaConteudo } from '../components/comum/PularParaConteudo.jsx'
import { TituloDaPagina } from '../components/comum/TituloDaPagina.jsx'
import { Hero } from '../components/landing/Hero.jsx'
import { ComoFunciona } from '../components/landing/ComoFunciona.jsx'
import { NavbarLanding } from '../components/landing/NavbarLanding.jsx'
import { Perfis } from '../components/landing/Perfis.jsx'
import '../styles/landing.css'

// Página pública de apresentação. Os ids das seções são as âncoras do menu e do rodapé.
// As seções entram uma a uma; por enquanto só a estrutura.
export function Landing() {
  return (
    <div className="landing">
      <TituloDaPagina titulo="Planejamento e precificação de eventos" />
      <PularParaConteudo />

      <NavbarLanding />

      <main id="conteudo" tabIndex={-1}>
        <Hero />

        <ComoFunciona />

        <Perfis />

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
