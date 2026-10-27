import { OrganizadorLayout } from '../components/organizador/OrganizadorLayout.jsx'
import { DUVIDAS } from '../data/duvidas.js'

export function Duvidas({ perfil = 'organizador' }) {
  return (
    <OrganizadorLayout
      perfil={perfil}
      titulo="Dúvidas"
      apoio="Respostas para as perguntas mais comuns sobre a plataforma."
      estreito
    >
      <div className="duvidas">
        {DUVIDAS[perfil].map((duvida) => (
          <details key={duvida.pergunta} className="duvida">
            <summary className="duvida__pergunta">{duvida.pergunta}</summary>
            <p className="duvida__resposta">{duvida.resposta}</p>
          </details>
        ))}
      </div>
    </OrganizadorLayout>
  )
}
