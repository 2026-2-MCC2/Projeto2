import { useState } from 'react'
import { CAMADAS, MOTIVOS, PODE_IMPORTAR } from '../content/estruturaProjeto.js'

/** Monte a frase "camada A importa de camada B" e veja se ela é válida. */
export function RegraDependencia() {
  const [origem, setOrigem] = useState('presentation')
  const [destino, setDestino] = useState('domain')

  const mesma = origem === destino
  const permitido = PODE_IMPORTAR[origem].includes(destino)
  const situacao = mesma ? 'mesma' : permitido ? 'permitido' : 'proibido'

  return (
    <section className="bloco">
      <h2>Regra de dependência</h2>
      <p className="apoio">
        As importações apontam para dentro: presentation pode importar de application, que pode
        importar de domain. O contrário não acontece. Monte um par e confira.
      </p>

      <div className="regra">
        <div className="regra__campo">
          <span className="regra__rotulo">um arquivo em</span>
          <div className="regra__botoes">
            {CAMADAS.map((camada) => (
              <button
                key={camada.id}
                type="button"
                className={`opcao ${camada.id === origem ? 'opcao--ativa' : ''}`}
                onClick={() => setOrigem(camada.id)}
              >
                {camada.nome}/
              </button>
            ))}
          </div>
        </div>

        <div className="regra__campo">
          <span className="regra__rotulo">importa de</span>
          <div className="regra__botoes">
            {CAMADAS.map((camada) => (
              <button
                key={camada.id}
                type="button"
                className={`opcao ${camada.id === destino ? 'opcao--ativa' : ''}`}
                onClick={() => setDestino(camada.id)}
              >
                {camada.nome}/
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={`veredito veredito--${situacao}`}>
        <p className="veredito__linha">
          <code>
            {origem}/ {situacao === 'proibido' ? 'não importa' : 'importa'} {destino}/
          </code>
        </p>
        <p className="veredito__motivo">{MOTIVOS[situacao]}</p>
      </div>
    </section>
  )
}
