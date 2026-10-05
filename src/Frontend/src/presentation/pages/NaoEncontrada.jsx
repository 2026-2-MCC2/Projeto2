import { Link } from 'react-router-dom'
import { Icone } from '../components/comum/Icone.jsx'
import { Logotipo } from '../components/comum/Logotipo.jsx'
import { BotaoAcessibilidade } from '../components/comum/BotaoAcessibilidade.jsx'
import ingressoEsquerda from '../assets/nao-encontrada/ingresso-esquerda.svg'
import ingressoDireita from '../assets/nao-encontrada/ingresso-direita.svg'
import '../styles/NaoEncontrada.css'

export function NaoEncontrada() {
  return (
    <main className="nao-encontrada">
      <div className="nao-encontrada__conteudo">
        <Link to="/" className="nao-encontrada__marca">
          <Logotipo className="nao-encontrada__logo" />
          <span className="nao-encontrada__selo">· Gestão</span>
        </Link>

        <div className="nao-encontrada__ilustracao">
          <Icone
            src={ingressoEsquerda}
            className="nao-encontrada__ingresso nao-encontrada__ingresso--esquerda"
          />
          <Icone
            src={ingressoDireita}
            className="nao-encontrada__ingresso nao-encontrada__ingresso--direita"
          />
        </div>

        <span className="nao-encontrada__etiqueta">ERRO 404</span>

        <div className="nao-encontrada__mensagem">
          <h1>Página não encontrada</h1>
          <p>
            O endereço acessado não existe ou o conteúdo foi removido. Verifique o link ou volte
            para o início.
          </p>
        </div>

        <Link to="/" className="nao-encontrada__botao">
          Voltar ao início
        </Link>
      </div>

      <BotaoAcessibilidade />
    </main>
  )
}
