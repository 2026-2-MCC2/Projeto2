import { Link } from 'react-router-dom'
import iconeAvancar from '../../assets/organizador/icone-avancar.svg'

export function Cartao({ titulo, link, etiqueta, children }) {
  return (
    <section className="cartao">
      <div className="cartao__titulo">
        <h2>{titulo}</h2>

        {etiqueta && <span className="etiqueta etiqueta--cotacao">{etiqueta}</span>}

        {link && (
          <Link to={link.para} className="cartao__link" viewTransition>
            {link.nome}
            <img src={iconeAvancar} alt="" />
          </Link>
        )}
      </div>

      {children}
    </section>
  )
}

export function ListaDeLinhas({ linhas, compacta = false }) {
  return (
    <div className="lista">
      {linhas.map((linha) => {
        const etiqueta = linha.etiqueta && (
          <span className={`etiqueta etiqueta--${linha.estiloDaEtiqueta}`}>{linha.etiqueta}</span>
        )

        return (
          <div key={linha.chave} className="lista__linha">
            <div className="lista__texto">
              <strong>{linha.titulo}</strong>
              {linha.apoio && <small>{linha.apoio}</small>}
              {compacta && etiqueta}
            </div>

            {!compacta && etiqueta}

            <strong className="lista__valor">{linha.valor}</strong>
          </div>
        )
      })}
    </div>
  )
}
