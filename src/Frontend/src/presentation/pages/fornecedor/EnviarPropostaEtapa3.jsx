import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { atualizarProposta, enviarPropostaComFotos } from '../../../application/propostas.js'
import { lerFotosPendentes } from '../../../application/rascunhosDePropostas.js'
import { RetornoDoEnvio } from '../../components/acesso/RetornoDoEnvio.jsx'
import { EtapaDaProposta } from '../../components/fornecedor/EtapaDaProposta.jsx'
import { ResumoItemCotacao, ResumoProposta } from '../../components/fornecedor/ResumoProposta.jsx'
import { Botao } from '../../components/organizador/Formulario.jsx'
import { useIsMobile } from '../../hooks/useIsMobile.js'
import { usePropostaEmEdicao } from '../../hooks/usePropostaEmEdicao.js'
import { useValidacao } from '../../hooks/useValidacao.js'
import { toast } from '../../toasts.js'
import '../../styles/fornecedor.css'

function CampoCondicao({ id, rotulo, obrigatorio = false, children }) {
  return (
    <label className="proposta-condicoes__campo" htmlFor={id}>
      <span>
        {rotulo} {obrigatorio && <b aria-hidden="true">*</b>}
      </span>
      {children}
    </label>
  )
}

// proposta que saiu de Enviada (retirada ou decidida) não aceita edição
const CODIGO_DE_PROPOSTA_INALTERAVEL = 'EVP000041'
export function EnviarPropostaEtapa3() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const validacao = useValidacao()
  const proposta = usePropostaEmEdicao()
  const { rascunho, preencher, item, evento } = proposta
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const voltar = () => navigate(proposta.rotaDaEtapa(2))
  // se o fornecedor sair no meio do envio, ele termina sem navegar, mas o toast aparece mesmo assim
  const telaAberta = useRef(true)

  useEffect(() => {
    telaAberta.current = true
    return () => {
      telaAberta.current = false
    }
  }, [])

  const irPara = (rota) => {
    if (telaAberta.current) navigate(rota)
  }

  async function aoEnviar(envio) {
    envio.preventDefault()
    setErro('')
    setEnviando(true)

    try {
      if (proposta.editando) {
        await atualizarProposta(proposta.proposalKey, rascunho)
        proposta.descartar()
        toast.sucesso('Proposta atualizada', { descricao: item.description })
        irPara(`/fornecedor/propostas/${proposta.proposalKey}`)
        return
      }

      const fotos = lerFotosPendentes(proposta.eventKey, proposta.itemKey)
      const { proposalKey, fotosQueFalharam } = await enviarPropostaComFotos(
        proposta.eventKey,
        proposta.itemKey,
        rascunho,
        fotos,
      )
      proposta.descartar()
      if (fotosQueFalharam > 0) {
        // a proposta já foi enviada: a tela dela mostra o que entrou, e Editar tenta as fotos de novo
        toast.erro('Proposta enviada, mas algumas fotos não foram anexadas', {
          descricao: `${fotosQueFalharam} de ${fotos.length} fotos. Abra a proposta e use Editar para enviar de novo.`,
        })
        irPara(`/fornecedor/propostas/${proposalKey}`)
        return
      }
      toast.sucesso(proposta.reenviando ? 'Proposta enviada de novo' : 'Proposta enviada', {
        descricao: fotos.length
          ? `${item.description} · ${fotos.length} ${fotos.length === 1 ? 'foto' : 'fotos'}`
          : item.description,
      })
      irPara('/fornecedor/propostas')
    } catch (falha) {
      // retirada (ou decidida) em outra aba enquanto editava: recarrega o item e a tela vira reenvio ou consulta
      if (
        proposta.editando &&
        falha.codigo === CODIGO_DE_PROPOSTA_INALTERAVEL &&
        telaAberta.current
      ) {
        toast.info('Esta proposta não pode mais ser editada', { descricao: falha.message })
        setEnviando(false)
        proposta.recarregarEvento()
        return
      }
      // ex.: "Você já enviou uma proposta para este item." ou validade fora do evento
      if (!telaAberta.current) {
        // a mensagem da tela sumiu com ela: o aviso vai por toast
        toast.erro(
          proposta.editando
            ? 'Não foi possível salvar a proposta'
            : 'Não foi possível enviar a proposta',
          { descricao: falha.message },
        )
        return
      }
      setErro(falha.message)
      setEnviando(false)
    }
  }

  const textoDoBotao = proposta.editando
    ? { parado: 'Salvar alterações', enviando: 'Salvando...' }
    : {
        parado: proposta.reenviando ? 'Enviar de novo' : 'Enviar proposta',
        enviando: 'Enviando...',
      }

  const acoes = (
    <div className="proposta-condicoes__acoes">
      {!isMobile && <span>* Campos obrigatórios</span>}
      <Botao type="button" secundario onClick={voltar} disabled={enviando}>
        Voltar
      </Botao>
      <Botao type="submit" form="form-proposta-condicoes" disabled={enviando}>
        {enviando ? textoDoBotao.enviando : textoDoBotao.parado}
      </Botao>
    </div>
  )

  return (
    <EtapaDaProposta proposta={proposta} etapa={3} aoVoltar={voltar} rodape={acoes}>
      {() => (
        <div className="proposta-condicoes">
          <form
            id="form-proposta-condicoes"
            className="proposta-condicoes__formulario"
            onSubmit={aoEnviar}
            {...validacao}
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
                      maxLength={255}
                      placeholder="Montagem 4h antes do evento"
                      value={rascunho.prazoDeEntrega}
                      onChange={preencher('prazoDeEntrega')}
                      required
                    />
                  </CampoCondicao>
                  <CampoCondicao id="prazo-pagamento" rotulo="Condição de pagamento" obrigatorio>
                    <input
                      id="prazo-pagamento"
                      type="text"
                      maxLength={255}
                      placeholder="50% na assinatura, 50% até 5 dias antes"
                      value={rascunho.condicaoDePagamento}
                      onChange={preencher('condicaoDePagamento')}
                      required
                    />
                  </CampoCondicao>
                  <CampoCondicao id="equipe-envolvida" rotulo="Equipe envolvida">
                    <input
                      id="equipe-envolvida"
                      type="text"
                      maxLength={255}
                      placeholder="12 garçons e 2 coordenadores"
                      value={rascunho.equipe}
                      onChange={preencher('equipe')}
                    />
                  </CampoCondicao>
                  <CampoCondicao id="garantia-substituicao" rotulo="Garantia ou substituição">
                    <input
                      id="garantia-substituicao"
                      type="text"
                      maxLength={255}
                      placeholder="Reposição de itens em até 1h"
                      value={rascunho.garantia}
                      onChange={preencher('garantia')}
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
                    maxLength={16383}
                    placeholder={
                      isMobile
                        ? 'Opcional'
                        : 'Opcional — condições especiais, restrições atendidas, prazos alternativos.'
                    }
                    value={rascunho.observacoes}
                    onChange={preencher('observacoes')}
                  />
                </CampoCondicao>
              </section>

              <RetornoDoEnvio erro={erro} />
            </div>
            {!isMobile && acoes}
          </form>
          {!isMobile && (
            <aside className="proposta-condicoes__resumo" aria-label="Resumo do item e da proposta">
              <ResumoItemCotacao item={item} evento={evento} />
              <ResumoProposta rascunho={rascunho} item={item} />
            </aside>
          )}
          {isMobile && <ResumoProposta rascunho={rascunho} item={item} />}
        </div>
      )}
    </EtapaDaProposta>
  )
}
