import { Fragment } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { OrganizadorLayout } from '../../components/organizador/OrganizadorLayout.jsx'
import { ProgressoEtapas } from '../../components/comum/ProgressoEtapas.jsx'
import { Botao } from '../../components/organizador/Formulario.jsx'
import { useIsMobile } from '../../hooks/useIsMobile.js'
import { EVENTOS_DISPONIVEIS } from '../../data/eventosDisponiveis.js'
import { ETAPAS_PROPOSTA, NOME_ITEM_PROPOSTA } from '../../data/propostaFornecedor.js'
import { ResumoItemCotacao, ResumoProposta } from '../../components/fornecedor/ResumoProposta.jsx'
import '../../styles/fornecedor.css'
import { Icone } from '../../components/comum/Icone.jsx'
import iconeConcluido from '../../assets/organizador/icone-concluido-verde.svg'

export function EnviarProposta() {
  const { id } = useParams()
  const navigate = useNavigate()
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
      apoio={`Item: ${NOME_ITEM_PROPOSTA} — até 500 convidados VIP`}
      subCabecalho={
        isMobile ? <ProgressoEtapas etapas={ETAPAS_PROPOSTA} etapaAtual={1} /> : undefined
      }
    >
      {isMobile ? null : <ProgressoPropostaDesktop />}

      <form
        id="form-enviar-proposta"
        className="enviar-proposta"
        onSubmit={(evento) => {
          evento.preventDefault()
          navigate(`/fornecedor/eventos/${id}/propostas/etapa-2`)
        }}
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
          <ResumoItemCotacao categoria={evento.categorias[0]} />
          <ResumoProposta />
        </aside>
      </form>
    </OrganizadorLayout>
  )
}

export function ProgressoPropostaDesktop({ etapaAtual = 1 }) {
  const etapas = ['Valor e validade', 'Descrição e fotos', 'Condições e envio']

  return (
    <nav className="enviar-proposta__progresso" aria-label="Etapas da proposta">
      {etapas.map((etapa, indice) => (
        <Fragment key={etapa}>
          <div className="enviar-proposta__etapa">
            <span
              className={`enviar-proposta__marcador${
                indice + 1 === etapaAtual
                  ? ' enviar-proposta__marcador--atual'
                  : indice + 1 < etapaAtual
                    ? ' enviar-proposta__marcador--feito'
                    : ''
              }`}
            >
              {indice + 1 < etapaAtual ? <Icone src={iconeConcluido} /> : indice + 1}
            </span>
            <span className="enviar-proposta__rotulo-etapa">
              <small>Etapa {indice + 1}</small>
              <strong
                className={indice + 1 === etapaAtual ? 'enviar-proposta__rotulo-etapa--atual' : ''}
              >
                {etapa}
              </strong>
            </span>
          </div>
          {indice < etapas.length - 1 && (
            <span
              className={`enviar-proposta__conector${indice + 1 < etapaAtual ? ' enviar-proposta__conector--feito' : ''}`}
            />
          )}
        </Fragment>
      ))}
    </nav>
  )
}
