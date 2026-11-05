import { useNavigate } from 'react-router-dom'
import { formatarMoeda } from '../../../application/eventos.js'
import { validarValidadeDaProposta } from '../../../domain/validacao.js'
import { EntradaData } from '../../components/comum/EntradaData.jsx'
import { EtapaDaProposta } from '../../components/fornecedor/EtapaDaProposta.jsx'
import { ResumoItemCotacao, ResumoProposta } from '../../components/fornecedor/ResumoProposta.jsx'
import { Botao } from '../../components/organizador/Formulario.jsx'
import { usePropostaEmEdicao } from '../../hooks/usePropostaEmEdicao.js'
import { useValidacao } from '../../hooks/useValidacao.js'
import '../../styles/fornecedor.css'

// Etapa 1 do envio de proposta: valor e validade.
export function EnviarProposta() {
  const navigate = useNavigate()
  const proposta = usePropostaEmEdicao()
  const { rascunho, preencher, item, evento } = proposta
  const validacao = useValidacao({
    validade: (valor) => validarValidadeDaProposta(valor, evento?.end_date),
  })

  return (
    <EtapaDaProposta proposta={proposta} etapa={1}>
      {() => (
        <form
          id="form-enviar-proposta"
          className="enviar-proposta"
          onSubmit={(envio) => {
            envio.preventDefault()
            navigate(proposta.rotaDaEtapa(2))
          }}
          {...validacao}
        >
          <section className="enviar-proposta__formulario">
            <div className="enviar-proposta__secao">
              <div className="enviar-proposta__cabecalho-secao">
                <h2>Valor e validade</h2>
                <p>O valor deve cobrir todo o escopo do item cotado.</p>
              </div>

              <div className="enviar-proposta__campos">
                <label className="enviar-proposta__campo">
                  <span>
                    Valor total da proposta <b aria-hidden="true">*</b>
                  </span>
                  <input
                    type="text"
                    name="valor"
                    inputMode="decimal"
                    placeholder="R$ 1.500,00"
                    data-validar="valorPositivo"
                    value={rascunho.valor}
                    onChange={preencher('valor')}
                    required
                  />
                  <small>
                    {item.estimated_value == null
                      ? 'O organizador não informou um orçamento previsto.'
                      : `Orçamento previsto pelo organizador: ${formatarMoeda(item.estimated_value)}.`}
                  </small>
                </label>

                <label className="enviar-proposta__campo">
                  <span>
                    Validade da proposta <b aria-hidden="true">*</b>
                  </span>
                  <EntradaData
                    name="validade"
                    data-validar="dataFutura"
                    value={rascunho.validade}
                    onChange={preencher('validade')}
                    required
                    semPassado
                  />
                  <small>Depois dessa data a proposta expira. Vale até o fim do evento.</small>
                </label>
              </div>

              <div className="enviar-proposta__acoes">
                <span>* Campos obrigatórios</span>
                <Botao type="submit" form="form-enviar-proposta">
                  Continuar
                </Botao>
              </div>
            </div>
          </section>

          <aside className="enviar-proposta__lateral">
            <ResumoItemCotacao item={item} evento={evento} />
            <ResumoProposta rascunho={rascunho} item={item} />
          </aside>
        </form>
      )}
    </EtapaDaProposta>
  )
}
