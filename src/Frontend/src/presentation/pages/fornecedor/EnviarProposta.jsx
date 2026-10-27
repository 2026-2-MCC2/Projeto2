import { useNavigate, useParams } from 'react-router-dom'
import { OrganizadorLayout } from '../../components/organizador/OrganizadorLayout.jsx'
import { Vazio } from '../../components/comum/EstadoDaTela.jsx'
import { EntradaData } from '../../components/comum/EntradaData.jsx'
import { PassosDasEtapas, ProgressoEtapas } from '../../components/comum/ProgressoEtapas.jsx'
import { Botao } from '../../components/organizador/Formulario.jsx'
import { useIsMobile } from '../../hooks/useIsMobile.js'
import { useValidacao } from '../../hooks/useValidacao.js'
import { EVENTOS_DISPONIVEIS } from '../../data/eventosDisponiveis.js'
import { ETAPAS_PROPOSTA, NOME_ITEM_PROPOSTA } from '../../data/propostaFornecedor.js'
import { ResumoItemCotacao, ResumoProposta } from '../../components/fornecedor/ResumoProposta.jsx'
import '../../styles/fornecedor.css'

export function EnviarProposta() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const validacao = useValidacao()
  const evento = EVENTOS_DISPONIVEIS.find((item) => item.id === id)

  if (!evento) {
    return (
      <OrganizadorLayout
        perfil="fornecedor"
        titulo="Evento não encontrado"
        voltarPara="/fornecedor/eventos"
      >
        <Vazio
          titulo="Este evento não está disponível"
          mensagem="Ele pode ter sido encerrado. Veja os eventos abertos para proposta."
        />
      </OrganizadorLayout>
    )
  }

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
      {!isMobile && <PassosDasEtapas etapas={ETAPAS_PROPOSTA} etapaAtual={1} tom="sucesso" />}

      <form
        id="form-enviar-proposta"
        className="enviar-proposta"
        onSubmit={(evento) => {
          evento.preventDefault()
          navigate(`/fornecedor/eventos/${id}/propostas/etapa-2`)
        }}
        data-evento-id={evento.id}
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
                  inputMode="decimal"
                  placeholder="R$ 49.800,00"
                  data-validar="valorPositivo"
                  required
                />
                <small>Orçamento previsto pelo organizador: R$ 45.000.</small>
              </label>

              <label className="enviar-proposta__campo">
                <span>
                  Validade da proposta <b aria-hidden="true">*</b>
                </span>
                <EntradaData
                  placeholder="30/09/2026"
                  data-validar="dataFutura"
                  required
                  semPassado
                />
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
