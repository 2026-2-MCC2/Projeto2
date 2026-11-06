import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icone } from '../comum/Icone.jsx'
import { BotaoLanding } from './BotaoLanding.jsx'
import { Logotipo } from '../comum/Logotipo.jsx'
import logotipoDaLanding from '../../assets/landing/logotipo-trocaticket.png'
import iconeMenu from '../../assets/landing/icone-menu.svg'
import iconeFechar from '../../assets/comum/icone-fechar.svg'
import { ROTA_DO_LOGIN } from '../../../application/sessao.js'

const LINKS = [
  { ancora: '#como-funciona', nome: 'Como funciona' },
  { ancora: '#organizadores', nome: 'Organizadores' },
  { ancora: '#fornecedores', nome: 'Fornecedores' },
  { ancora: '#calculo-do-ticket', nome: 'Cálculo do ticket' },
  { ancora: '#duvidas', nome: 'Dúvidas' },
]

// a partir daqui os links não cabem numa linha e viram o menu (o mesmo valor do landing.css)
const TELA_LARGA = '(min-width: 1101px)'

export function NavbarLanding() {
  const [aberto, setAberto] = useState(false)
  const topo = useRef(null)
  const alternar = useRef(null)

  useEffect(() => {
    if (!aberto) return

    function aoClicarFora(evento) {
      if (!topo.current?.contains(evento.target)) setAberto(false)
    }

    // o foco volta para o botão, senão ele se perderia dentro do menu que sumiu
    function aoTeclar(evento) {
      if (evento.key !== 'Escape') return
      setAberto(false)
      alternar.current?.focus()
    }

    const telaLarga = window.matchMedia(TELA_LARGA)
    const aoAlargar = (evento) => evento.matches && setAberto(false)

    document.addEventListener('mousedown', aoClicarFora)
    document.addEventListener('keydown', aoTeclar)
    telaLarga.addEventListener('change', aoAlargar)

    return () => {
      document.removeEventListener('mousedown', aoClicarFora)
      document.removeEventListener('keydown', aoTeclar)
      telaLarga.removeEventListener('change', aoAlargar)
    }
  }, [aberto])

  const fechar = () => setAberto(false)

  return (
    <header className="landing-topo" ref={topo}>
      <Link to="/" className="landing-topo__marca">
        <Logotipo imagemClara={logotipoDaLanding} className="logotipo-landing landing-topo__logo" />
      </Link>

      <button
        ref={alternar}
        type="button"
        className="landing-topo__alternar"
        aria-label="Menu"
        aria-expanded={aberto}
        aria-controls="landing-menu"
        onClick={() => setAberto((estava) => !estava)}
      >
        <Icone src={aberto ? iconeFechar : iconeMenu} />
      </button>

      <nav
        id="landing-menu"
        aria-label="Principal"
        className={`landing-topo__menu${aberto ? ' landing-topo__menu--aberto' : ''}`}
      >
        <ul className="landing-topo__links">
          {LINKS.map((link) => (
            <li key={link.ancora}>
              <a href={link.ancora} className="landing-topo__link" onClick={fechar}>
                {link.nome}
              </a>
            </li>
          ))}
        </ul>

        <div className="landing-topo__acoes">
          <BotaoLanding tipo="secundario" para={ROTA_DO_LOGIN}>
            Entrar
          </BotaoLanding>
          <BotaoLanding para="/cadastro">Criar cadastro</BotaoLanding>
        </div>
      </nav>
    </header>
  )
}
