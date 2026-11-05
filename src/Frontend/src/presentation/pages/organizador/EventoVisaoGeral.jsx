import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { EventoLayout } from '../../components/organizador/EventoLayout.jsx'
import { Vazio } from '../../components/comum/EstadoDaTela.jsx'
import { Cartao, ListaDeLinhas } from '../../components/organizador/Cartao.jsx'
import { Botao, Campo } from '../../components/organizador/Formulario.jsx'
import { Modal } from '../../components/comum/Modal.jsx'
import { useIsMobile } from '../../hooks/useIsMobile.js'
import { useEvento } from '../../hooks/useEvento.js'
import { toast } from '../../toasts.js'
import {
  cancelarEvento,
  eventoPodeSerEditado,
  publicarEventoParaCotacao,
} from '../../../application/eventos.js'
import { Icone } from '../../components/comum/Icone.jsx'
import iconePublicar from '../../assets/comum/icone-enviar.svg'
import iconeCancelar from '../../assets/admin/icone-modal-rejeitar.svg'
import iconeConcluida from '../../assets/organizador/icone-concluido-verde.svg'
import iconeAtual from '../../assets/organizador/icone-etapa-atual.svg'
import iconeFutura from '../../assets/organizador/icone-etapa-futura.svg'

// custo próprio do evento não passa por cotação, então não leva etiqueta
const ETIQUETA_DA_SITUACAO = {
  aceita: { longa: 'Proposta aceita', curta: 'Aceita', estilo: 'aprovado' },
  cotacao: { longa: 'Em cotação', curta: 'Em cotação', estilo: 'cotacao' },
}

const ICONE_DA_ETAPA = {
  concluida: iconeConcluida,
  atual: iconeAtual,
  futura: iconeFutura,
}

export function EventoVisaoGeral() {
  const { id } = useParams()
  const isMobile = useIsMobile()
  const [confirmandoPublicacao, setConfirmandoPublicacao] = useState(false)
  const [publicando, setPublicando] = useState(false)
  const [confirmandoCancelamento, setConfirmandoCancelamento] = useState(false)
  const [cancelando, setCancelando] = useState(false)
  const [motivoDoCancelamento, setMotivoDoCancelamento] = useState('')
  const navigate = useNavigate()
  const { evento } = useEvento(id)
  const detalhe = evento?.detalhe

  if (!detalhe) {
    return (
      <EventoLayout>
        <Vazio
          titulo="Sem informações do evento"
          mensagem="O resumo aparece quando o evento tiver itens de custo cadastrados."
        />
      </EventoLayout>
    )
  }

  // a resposta da publicação atualiza o evento em memória, e a tela acompanha sem recarregar
  async function confirmarPublicacao() {
    setPublicando(true)
    try {
      await publicarEventoParaCotacao(id)
      toast.sucesso('Evento publicado para cotação', { descricao: evento.nome })
    } catch (falha) {
      toast.erro('Não foi possível publicar o evento', { descricao: falha.message })
    } finally {
      setPublicando(false)
      setConfirmandoPublicacao(false)
    }
  }

  async function confirmarCancelamento() {
    setCancelando(true)
    try {
      await cancelarEvento(id, motivoDoCancelamento.trim())
      toast.sucesso('Evento cancelado', { descricao: evento.nome })
      setConfirmandoCancelamento(false)
      setMotivoDoCancelamento('')
    } catch (falha) {
      toast.erro('Não foi possível cancelar o evento', { descricao: falha.message })
    } finally {
      setCancelando(false)
    }
  }

  const podeEditar = eventoPodeSerEditado(evento)

  const acoes = (
    <>
      {podeEditar && (
        <Botao
          type="button"
          secundario
          onClick={() => navigate(`/organizador/eventos/${id}/editar`, { viewTransition: true })}
        >
          Editar evento
        </Botao>
      )}
      {podeEditar && (
        <Botao
          type="button"
          secundario
          className="botao--texto-perigo"
          onClick={() => setConfirmandoCancelamento(true)}
        >
          Cancelar evento
        </Botao>
      )}
      {evento.status === 'planejamento' && (
        <Botao type="button" onClick={() => setConfirmandoPublicacao(true)}>
          Publicar para cotação
        </Botao>
      )}
    </>
  )

  const modalDePublicacao = confirmandoPublicacao && (
    <Modal
      icone={iconePublicar}
      titulo="Publicar evento para cotação?"
      mensagem="O evento e seus itens abertos ficarão visíveis para os fornecedores aprovados nas categorias escolhidas. Você ainda pode editar o evento depois."
      dados={[
        { rotulo: 'Evento', valor: evento.nome },
        { rotulo: 'Período', valor: evento.periodo },
        { rotulo: 'Local', valor: evento.local },
      ]}
      acao={{
        cancelar: 'Cancelar',
        confirmar: publicando ? 'Publicando...' : 'Publicar evento',
        aoConfirmar: confirmarPublicacao,
        ocupado: publicando,
      }}
      aoFechar={() => !publicando && setConfirmandoPublicacao(false)}
    />
  )

  const itensComProposta = detalhe.itens.filter((item) => item.propostasCount > 0).length
  const propostasAceitas = detalhe.itens.filter((item) => item.situacao === 'aceita').length
  const avisoAosFornecedores =
    itensComProposta > 0
      ? ' As propostas em aberto e as aceitas serão canceladas, e cada fornecedor recebe um e-mail com o motivo.'
      : ''

  const modalDeCancelamento = confirmandoCancelamento && (
    <Modal
      icone={iconeCancelar}
      corDoIcone="vermelho"
      titulo="Cancelar este evento?"
      mensagem={`O evento sai da cotação e não pode mais ser editado nem publicado. Não dá para desfazer.${avisoAosFornecedores}`}
      dados={[
        { rotulo: 'Evento', valor: evento.nome },
        { rotulo: 'Período', valor: evento.periodo },
        ...(propostasAceitas > 0 ? [{ rotulo: 'Propostas aceitas', valor: propostasAceitas }] : []),
      ]}
      acao={{
        cancelar: 'Voltar',
        confirmar: cancelando ? 'Cancelando...' : 'Cancelar evento',
        aoConfirmar: confirmarCancelamento,
        ocupado: cancelando,
      }}
      aoFechar={() => !cancelando && setConfirmandoCancelamento(false)}
    >
      <Campo rotulo="Motivo do cancelamento">
        <textarea
          rows={2}
          maxLength={500}
          placeholder="Ex.: local indisponível na data."
          value={motivoDoCancelamento}
          onChange={(evento) => setMotivoDoCancelamento(evento.target.value.trimStart())}
          required
        />
      </Campo>
    </Modal>
  )

  const dadosDoEvento = (
    <Cartao titulo="Dados do evento">
      <div className="ficha">
        {(isMobile ? detalhe.dadosMobile : detalhe.dados).map((dado) => (
          <div key={dado.rotulo} className="ficha__dado">
            <span>{dado.rotulo}</span>
            <strong>{dado.valor}</strong>
          </div>
        ))}
      </div>
    </Cartao>
  )

  const orcamento = (
    <Cartao
      titulo={isMobile ? 'Orçamento' : 'Orçamento do evento'}
      link={{
        para: `/organizador/eventos/${id}/itens`,
        nome: isMobile ? 'Ver itens' : 'Ver itens de custo',
      }}
    >
      <SituacaoDoOrcamento
        orcamento={detalhe.orcamento}
        isMobile={isMobile}
        rotaDeEdicao={`/organizador/eventos/${id}/editar`}
        podeEditar={podeEditar}
      />
    </Cartao>
  )

  const itensDeCusto = (
    <Cartao
      titulo="Itens de custo"
      link={{
        para: `/organizador/eventos/${id}/itens`,
        nome: nomeDoLinkDosItens(detalhe.totalDeItens, isMobile),
      }}
    >
      {detalhe.itens.length === 0 && (
        <p className="cartao__vazio">Nenhum item de custo cadastrado ainda.</p>
      )}
      <ListaDeLinhas
        compacta={isMobile}
        linhas={detalhe.itens.map((item) => ({
          chave: item.chave,
          titulo: item.nome,
          apoio: isMobile ? undefined : item.categoria,
          etiqueta: ETIQUETA_DA_SITUACAO[item.situacao]?.[isMobile ? 'curta' : 'longa'],
          estiloDaEtiqueta: ETIQUETA_DA_SITUACAO[item.situacao]?.estilo,
          valor: item.valor,
        }))}
      />
    </Cartao>
  )

  const totalDePropostas = detalhe.propostasRecebidas.reduce(
    (total, item) => total + item.propostasCount,
    0,
  )

  const propostas = (
    <Cartao
      titulo="Propostas recebidas"
      complemento={
        totalDePropostas > 0
          ? `${totalDePropostas} ${totalDePropostas === 1 ? 'proposta' : 'propostas'}`
          : undefined
      }
      link={
        totalDePropostas > 0
          ? {
              para: `/organizador/eventos/${id}/propostas`,
              nome: isMobile ? 'Comparar' : 'Comparar propostas',
            }
          : undefined
      }
    >
      {totalDePropostas === 0 ? (
        <p className="cartao__vazio">Não há propostas</p>
      ) : (
        <ListaDeLinhas
          compacta={isMobile}
          linhas={detalhe.propostasRecebidas.map((item) => ({
            chave: item.chave,
            titulo: item.nome,
            apoio: `${item.propostasCount} ${item.propostasCount === 1 ? 'proposta' : 'propostas'}`,
            etiqueta: ETIQUETA_DA_SITUACAO[item.situacao]?.[isMobile ? 'curta' : 'longa'],
            estiloDaEtiqueta: ETIQUETA_DA_SITUACAO[item.situacao]?.estilo,
            valor: item.situacao === 'aceita' ? item.valor : undefined,
          }))}
        />
      )}
    </Cartao>
  )

  const ticketLongo = (detalhe.ticketEstimado.valor || '').length > 11

  const ticket = (
    <Cartao titulo="Ticket estimado" etiqueta={detalhe.ticketEstimado.cenario}>
      <strong
        className={`ticket__valor${ticketLongo ? ' ticket__valor--compacto' : ''}`}
        title={detalhe.ticketEstimado.valor}
      >
        {detalhe.ticketEstimado.valor}
      </strong>
      <p className="cartao__apoio">{detalhe.ticketEstimado.explicacao}</p>

      <div className="cartao__divisor" />

      <div className="cenarios">
        {detalhe.ticketEstimado.cenarios.map((cenario) => {
          const valorLongo = (cenario.valor || '').length > 10
          return (
            <div key={cenario.nome} className="cenario">
              <span className="cenario__nome">{cenario.nome}</span>
              <strong
                title={cenario.valor}
                className={`cenario__valor${cenario.destaque ? ' cenario__valor--destaque' : ''}${valorLongo ? ' cenario__valor--compacto' : ''}`}
              >
                {cenario.valor}
              </strong>
              <small>{cenario.publico}</small>
            </div>
          )
        })}
      </div>

      <Link to={`/organizador/eventos/${id}/ticket`} className="cartao__link" viewTransition>
        Ver cálculo completo
      </Link>
    </Cartao>
  )

  if (isMobile) {
    return (
      <EventoLayout acoes={acoes}>
        {dadosDoEvento}
        {orcamento}
        {itensDeCusto}
        {propostas}
        {ticket}
        {modalDePublicacao}
        {modalDeCancelamento}
      </EventoLayout>
    )
  }

  return (
    <EventoLayout acoes={acoes} comResumo>
      <div className="colunas">
        <div className="colunas__principal">
          {dadosDoEvento}
          {orcamento}
          {itensDeCusto}
          {propostas}
        </div>

        <div className="colunas__lateral">
          {ticket}

          <Cartao titulo="Andamento do planejamento">
            <div className="andamento">
              {detalhe.andamento.map((etapa) => (
                <div
                  key={etapa.nome}
                  className={`andamento__etapa andamento__etapa--${etapa.situacao}`}
                >
                  <Icone src={ICONE_DA_ETAPA[etapa.situacao]} />
                  {etapa.nome}
                </div>
              ))}
            </div>
          </Cartao>
        </div>
      </div>

      {modalDePublicacao}
      {modalDeCancelamento}
    </EventoLayout>
  )
}

function nomeDoLinkDosItens(totalDeItens, isMobile) {
  if (totalDeItens === 0) return 'Cadastrar itens'
  return isMobile ? 'Ver todos' : `Ver todos os ${totalDeItens} itens`
}

function SituacaoDoOrcamento({ orcamento, isMobile, rotaDeEdicao, podeEditar }) {
  const consolidado = (
    <Indicador
      rotulo={isMobile ? 'CONSOLIDADO' : 'CUSTO CONSOLIDADO'}
      valor={orcamento.consolidado}
    />
  )

  if (!orcamento.teto) {
    return (
      <>
        <div className="indicadores">
          {consolidado}
          <Indicador rotulo="TETO DE GASTOS" valor="Não definido" />
        </div>
        <div className="progresso-orcamento progresso-orcamento--vazio" aria-hidden="true" />
        <div className="orcamento-sem-teto">
          <p>Defina um teto de gastos para acompanhar quanto do orçamento já foi usado.</p>
          {podeEditar && (
            <Link to={rotaDeEdicao} className="botao botao--secundario orcamento-sem-teto__botao">
              Definir teto
            </Link>
          )}
        </div>
      </>
    )
  }

  return (
    <>
      <div className="indicadores">
        {consolidado}
        <Indicador rotulo="TETO DE GASTOS" valor={orcamento.teto} />
        <Indicador
          rotulo={orcamento.acimaDoTeto ? 'ACIMA DO TETO' : 'DISPONÍVEL'}
          valor={orcamento.saldo}
          positivo={!orcamento.acimaDoTeto}
          negativo={orcamento.acimaDoTeto}
        />
      </div>

      <div
        className={`progresso-orcamento${orcamento.acimaDoTeto ? ' progresso-orcamento--acima' : ''}`}
      >
        <span style={{ width: `${Math.min(orcamento.comprometido, 100)}%` }} />
      </div>

      <p className="cartao__apoio">
        {orcamento.acimaDoTeto
          ? `Os custos passaram ${orcamento.saldo} do teto de gastos.`
          : `${orcamento.comprometido}% do teto de gastos ${isMobile ? 'comprometido' : 'já está comprometido'}`}
      </p>
    </>
  )
}

function Indicador({ rotulo, valor, positivo = false, negativo = false }) {
  const valorLongo = String(valor ?? '').length > 11
  const classeValor = [
    positivo && 'indicador__valor--positivo',
    negativo && 'indicador__valor--negativo',
    valorLongo && 'indicador__valor--compacto',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="indicador">
      <span>{rotulo}</span>
      <strong title={valor} className={classeValor || undefined}>
        {valor}
      </strong>
    </div>
  )
}
