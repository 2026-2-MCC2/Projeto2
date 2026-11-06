import { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { rotaInicialDoPerfil, usuarioAtual } from '../../application/sessao.js'
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

// os ids das seções são as âncoras do menu e do rodapé
export function Landing() {
  const { hash } = useLocation()
  const usuario = usuarioAtual()

  // a página chega depois (lazy), então o navegador não acha a âncora sozinho ao abrir /#secao
  useEffect(() => {
    if (hash) document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView()
  }, [hash])

  if (usuario) return <Navigate to={rotaInicialDoPerfil(usuario.perfil)} replace />

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
