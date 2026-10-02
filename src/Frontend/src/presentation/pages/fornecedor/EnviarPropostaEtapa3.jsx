import { useNavigate, useParams } from 'react-router-dom'
import { OrganizadorLayout } from '../../components/organizador/OrganizadorLayout.jsx'
import { Botao } from '../../components/organizador/Formulario.jsx'
import { ProgressoEtapas } from '../../components/comum/ProgressoEtapas.jsx'
import { ProgressoPropostaDesktop } from './EnviarProposta.jsx'
import { useIsMobile } from '../../hooks/useIsMobile.js'
import { EVENTOS_DISPONIVEIS } from '../../data/eventosDisponiveis.js'
import {
  ETAPAS_PROPOSTA,
  NOME_ITEM_PROPOSTA,
  salvarPropostaFornecedor,
} from '../../data/propostaFornecedor.js'
import { ResumoItemCotacao, ResumoProposta } from '../../components/fornecedor/ResumoProposta.jsx'
import '../../styles/fornecedor.css'

function CampoCondicao({ id, rotulo, obrigatorio = false, somenteDesktop = false, children }) {
  return (
    <label
      className={`proposta-condicoes__campo${somenteDesktop ? ' proposta-condicoes__campo--somente-desktop' : ''}`}
      htmlFor={id}
    >
      <span>
        {rotulo} {obrigatorio && <b aria-hidden="true">*</b>}
      </span>
      {children}
    </label>
  )
}

export function EnviarPropostaEtapa3() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const evento = EVENTOS_DISPONIVEIS.find((item) => item.id === id) ?? EVENTOS_DISPONIVEIS[0]
  const voltar = () => navigate(`/fornecedor/eventos/${evento.id}/propostas/etapa-2`)

  const acoes = (
    <div className="proposta-condicoes__acoes">
      {!isMobile && <span>* Campos obrigatórios</span>}
      <Botao type="button" secundario onClick={voltar}>
        Voltar
      </Botao>
      <Botao type="submit" form="form-proposta-condicoes">
        Enviar proposta
      </Botao>
    </div>
  )

  return (
    <OrganizadorLayout
      perfil="fornecedor"
      titulo="Enviar proposta"
      sobreTitulo={`Eventos disponíveis · ${evento.nome}`}
      apoio={`Item: ${NOME_ITEM_PROPOSTA} — até 500 convidados VIP`}
      aoVoltar={voltar}
      subCabecalho={
        isMobile ? <ProgressoEtapas etapas={ETAPAS_PROPOSTA} etapaAtual={3} /> : undefined
      }
      rodape={acoes}
    >
      {!isMobile && <ProgressoPropostaDesktop etapaAtual={3} />}
      <div className="proposta-condicoes">
        <form
          id="form-proposta-condicoes"
          className="proposta-condicoes__formulario"
          data-evento-id={evento.id}
          onSubmit={(submit) => {
            submit.preventDefault()
            salvarPropostaFornecedor({ evento, item: NOME_ITEM_PROPOSTA, valor: 49800 })
            navigate('/fornecedor/propostas')
          }}
        >
          <div className="proposta-condicoes__conteudo">
            <h2 className="proposta-condicoes__titulo-mobile">Condições e revisão</h2>
            <section className="proposta-condicoes__execucao">
              <h2>Condições de execução</h2>
              <div className="proposta-condicoes__campos">
                <CampoCondicao
                  id="prazo-montagem"
                  rotulo="Prazo de entrega ou montagem"
                  obrigatorio
                >
                  <input
                    id="prazo-montagem"
                    type="text"
                    placeholder="Montagem 4h antes do evento"
                  />
                </CampoCondicao>
                <CampoCondicao id="prazo-pagamento" rotulo="Condição de pagamento" obrigatorio>
                  <input
                    id="prazo-pagamento"
                    type="text"
                    placeholder="50% na assinatura, 50% até 5 dias antes"
                  />
                </CampoCondicao>
                <CampoCondicao id="equipe-envolvida" rotulo="Equipe envolvida" somenteDesktop>
                  <input
                    id="equipe-envolvida"
                    type="text"
                    placeholder="12 garçons e 2 coordenadores"
                  />
                </CampoCondicao>
                <CampoCondicao
                  id="garantia-substituicao"
                  rotulo="Garantia ou substituição"
                  somenteDesktop
                >
                  <input
                    id="garantia-substituicao"
                    type="text"
                    placeholder="Reposição de itens em até 1h"
                  />
                </CampoCondicao>
              </div>
            </section>

            <section className="proposta-condicoes__observacoes">
              <h2>Observações</h2>
              <CampoCondicao
                id="observacoes-condicoes"
                rotulo={isMobile ? 'Observações' : 'Observações para o organizador'}
              >
                <textarea
                  id="observacoes-condicoes"
                  rows={2}
                  placeholder={
                    isMobile
                      ? 'Opcional'
                      : 'Opcional — condições especiais, restrições alimentares atendidas, prazos alternativos.'
                  }
                />
              </CampoCondicao>
            </section>
          </div>
          {!isMobile && acoes}
        </form>
        {!isMobile && (
          <aside className="proposta-condicoes__resumo" aria-label="Resumo do item e da proposta">
            <ResumoItemCotacao categoria={evento.categorias[0]} />
            <ResumoProposta />
          </aside>
        )}
        {isMobile && <ResumoProposta />}
      </div>
    </OrganizadorLayout>
  )
}
