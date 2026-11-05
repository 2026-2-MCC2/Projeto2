import { BotaoAcessibilidade } from '../components/comum/BotaoAcessibilidade.jsx'
import { PularParaConteudo } from '../components/comum/PularParaConteudo.jsx'
import { TituloDaPagina } from '../components/comum/TituloDaPagina.jsx'
import { Hero } from '../components/landing/Hero.jsx'
import { CalculoDoTicket } from '../components/landing/CalculoDoTicket.jsx'
import { ChamadaFinal } from '../components/landing/ChamadaFinal.jsx'
import { ComoFunciona } from '../components/landing/ComoFunciona.jsx'
import { DuvidasFrequentes } from '../components/landing/DuvidasFrequentes.jsx'
import { NavbarLanding } from '../components/landing/NavbarLanding.jsx'
import { Perfis } from '../components/landing/Perfis.jsx'
import { RodapeLanding } from '../components/landing/RodapeLanding.jsx'
import '../styles/landing.css'

// Página principal do site ("/"): apresentação da TrocaTicket. Os ids das seções são as âncoras
// do menu e do rodapé. Os botões flutuantes de tema e acessibilidade são os mesmos das outras telas.
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

        <CalculoDoTicket />

        <DuvidasFrequentes />

        <ChamadaFinal />
      </main>

      <RodapeLanding />

      <BotaoAcessibilidade />
    </div>
  )
}
