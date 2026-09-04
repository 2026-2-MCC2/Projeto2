import { useState } from 'react'
import { ARVORE, CAMADAS } from '../content/estruturaProjeto.js'
import { DiagramaCamadas } from './DiagramaCamadas.jsx'

/** Clicar em uma camada ou em um caminho abre a explicação correspondente. */
export function ExploradorEstrutura() {
  const [camadaId, setCamadaId] = useState('domain')
  const camada = CAMADAS.find((c) => c.id === camadaId)

  return (
    <section className="bloco">
      <h2>Camadas</h2>
      <p className="apoio">
        Da mais interna para a mais externa. Quanto mais interna, menos motivos para mudar.
      </p>

      <DiagramaCamadas camadaAtiva={camadaId} aoSelecionar={setCamadaId} />

      <div className="explorador">
        <div>
          <div className="camadas">
            {CAMADAS.map((item, indice) => (
              <button
                key={item.id}
                type="button"
                className={`camada ${item.id === camadaId ? 'camada--ativa' : ''}`}
                onClick={() => setCamadaId(item.id)}
              >
                <span className="camada__indice">{indice + 1}</span>
                <span className="camada__nome">{item.nome}/</span>
                <span className="camada__resumo">{item.resumo}</span>
              </button>
            ))}
          </div>

          <h3>Estrutura de pastas</h3>
          <ul className="arvore">
            {ARVORE.map((no) => (
              <li key={no.caminho + no.nivel}>
                <button
                  type="button"
                  className={`arvore__item ${no.camada === camadaId ? 'arvore__item--ativo' : ''}`}
                  style={{ paddingLeft: `${0.75 + no.nivel * 1.1}rem` }}
                  onClick={() => no.camada && setCamadaId(no.camada)}
                  disabled={!no.camada}
                >
                  <span className="arvore__nome">{no.caminho}</span>
                  <span className="arvore__nota">{no.nota}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="detalhe">
          <p className="detalhe__caminho">{camada.caminho}</p>
          <p className="detalhe__texto">{camada.detalhe}</p>

          <ul className="restricoes">
            {camada.proibicoes.map((regra) => (
              <li key={regra}>{regra}</li>
            ))}
          </ul>

          <p className="detalhe__arquivo">{camada.exemplo.arquivo}</p>
          <pre className="codigo">
            <code>{camada.exemplo.codigo}</code>
          </pre>
        </div>
      </div>
    </section>
  )
}
