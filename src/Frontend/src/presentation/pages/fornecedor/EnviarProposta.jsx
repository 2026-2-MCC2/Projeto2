import { Fragment } from 'react'
import { useParams } from 'react-router-dom'
import { OrganizadorLayout } from '../../components/organizador/OrganizadorLayout.jsx'
import { ProgressoEtapas } from '../../components/comum/ProgressoEtapas.jsx'
import { Botao } from '../../components/organizador/Formulario.jsx'
import { useIsMobile } from '../../hooks/useIsMobile.js'
import { EVENTOS_DISPONIVEIS } from '../../data/eventosDisponiveis.js'
import '../../styles/fornecedor.css'

const ETAPAS_PROPOSTA = ['Valor e validade', 'Detalhes', 'Revisão']
const NOME_ITEM = 'Buffet finger foods premium'

export function EnviarProposta() {
  const { id } = useParams()
  const isMobile = useIsMobile()
  const evento = EVENTOS_DISPONIVEIS.find((item) => item.id === id) ?? EVENTOS_DISPONIVEIS[0]

  const acoes = (
    <Botao type="submit" form="form-enviar-proposta">
      Continuar
    </Botao>
  )

  return (
    <OrganizadorLayout
      perfil="fornecedor"
      titulo="Enviar proposta"
      sobreTitulo={`Eventos disponíveis · ${evento.nome}`}
      apoio={`Item: ${NOME_ITEM} — até 500 convidados VIP`}
      subCabecalho={
        isMobile ? <ProgressoEtapas etapas={ETAPAS_PROPOSTA} etapaAtual={1} /> : undefined
      }
    >
      {isMobile ? null : <ProgressoPropostaDesktop />}

      <form
        id="form-enviar-proposta"
        className="enviar-proposta"
        onSubmit={(evento) => evento.preventDefault()}
        data-evento-id={evento.id}
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
                <input type="text" inputMode="decimal" placeholder="R$ 49.800,00" />
                <small>Orçamento previsto pelo organizador: R$ 45.000.</small>
              </label>

              <label className="enviar-proposta__campo">
                <span>
                  Validade da proposta <b aria-hidden="true">*</b>
                </span>
                <input type="text" inputMode="numeric" placeholder="30/09/2026" />
                <small>Depois dessa data a proposta expira.</small>
              </label>
            </div>

            <div className="enviar-proposta__acoes">
              <span>* Campos obrigatórios</span>
              {acoes}
            </div>
          </div>
        </section>

        <aside className="enviar-proposta__lateral">
          <section className="enviar-proposta__cartao" aria-labelledby="titulo-item-cotacao">
            <h2 id="titulo-item-cotacao">Item em cotação</h2>
            <strong className="enviar-proposta__nome-item">{NOME_ITEM}</strong>
            <div>
              <span>Categoria</span>
              <strong>{evento.categorias[0]}</strong>
            </div>
            <div>
              <span>Orçamento previsto</span>
              <strong>R$ 45.000</strong>
            </div>
            <div>
              <span>Prazo para envio</span>
              <strong>25 Set 2026</strong>
            </div>
          </section>

          <section
            className="enviar-proposta__cartao enviar-proposta__cartao--destaque"
            aria-labelledby="titulo-minha-proposta"
          >
            <h2 id="titulo-minha-proposta">Sua proposta</h2>
            <strong className="enviar-proposta__valor">R$ 49.800,00</strong>
            <span className="enviar-proposta__diferenca">10,7% acima do previsto</span>
            <span className="enviar-proposta__validade">Válida até 30 Set 2026</span>
          </section>
        </aside>
      </form>
    </OrganizadorLayout>
  )
}

function ProgressoPropostaDesktop() {
  const etapas = ['Valor e validade', 'Descrição e fotos', 'Condições e envio']

  return (
    <nav className="enviar-proposta__progresso" aria-label="Etapas da proposta">
      {etapas.map((etapa, indice) => (
        <Fragment key={etapa}>
          <div className="enviar-proposta__etapa">
            <span
              className={`enviar-proposta__marcador${indice === 0 ? ' enviar-proposta__marcador--atual' : ''}`}
            >
              {indice + 1}
            </span>
            <span className="enviar-proposta__rotulo-etapa">
              <small>Etapa {indice + 1}</small>
              <strong>{etapa}</strong>
            </span>
          </div>
          {indice < etapas.length - 1 && <span className="enviar-proposta__conector" />}
        </Fragment>
      ))}
    </nav>
  )
}
