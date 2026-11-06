import { Link } from 'react-router-dom'
import { Logotipo } from '../comum/Logotipo.jsx'
import logotipoDaLanding from '../../assets/landing/logotipo-trocaticket.png'
import { ROTA_DO_LOGIN } from '../../../application/sessao.js'

// âncoras (#) levam às seções desta página; o resto são rotas do app
const COLUNAS = [
  {
    titulo: 'Plataforma',
    links: [
      { nome: 'Como funciona', destino: '#como-funciona' },
      { nome: 'Cálculo do ticket', destino: '#calculo-do-ticket' },
      { nome: 'Dúvidas', destino: '#duvidas' },
    ],
  },
  {
    titulo: 'Perfis',
    links: [
      { nome: 'Organizadores', destino: '#organizadores' },
      { nome: 'Fornecedores', destino: '#fornecedores' },
    ],
  },
  {
    titulo: 'Acesso',
    links: [
      { nome: 'Entrar', destino: ROTA_DO_LOGIN },
      { nome: 'Criar cadastro', destino: '/cadastro' },
      { nome: 'Recuperar senha', destino: '/recuperar-senha' },
    ],
  },
]

export function RodapeLanding() {
  return (
    <footer className="rodape-landing">
      <div className="rodape-landing__topo">
        <div className="rodape-landing__marca">
          <Logotipo
            imagemClara={logotipoDaLanding}
            className="logotipo-landing rodape-landing__logo"
          />
          <p>Planejamento, cotação e precificação de eventos.</p>
        </div>

        <nav className="rodape-landing__colunas" aria-label="Rodapé">
          {COLUNAS.map((coluna) => (
            <div key={coluna.titulo} className="rodape-landing__coluna">
              <p id={`rodape-${coluna.titulo.toLowerCase()}`} className="rodape-landing__titulo">
                {coluna.titulo}
              </p>
              <ul aria-labelledby={`rodape-${coluna.titulo.toLowerCase()}`}>
                {coluna.links.map((link) => (
                  <li key={link.nome}>
                    {link.destino.startsWith('#') ? (
                      <a href={link.destino}>{link.nome}</a>
                    ) : (
                      <Link to={link.destino}>{link.nome}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      <div className="rodape-landing__base">
        <p>© 2026 TrocaTicket. Todos os direitos reservados.</p>
        <p className="rodape-landing__assinatura">Do orçamento ao preço do ingresso.</p>
      </div>
    </footer>
  )
}
