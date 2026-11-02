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

  const modalDeCancelamento = confirmandoCancelamento && (
    <Modal
      icone={iconeCancelar}
      corDoIcone="vermelho"
      titulo="Cancelar este evento?"
      mensagem="O evento sai da cotação e não pode mais ser editado nem publicado. Não dá para desfazer."
      dados={[
        { rotulo: 'Evento', valor: evento.nome },
        { rotulo: 'Período', valor: evento.periodo },
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

  const avisoDeCancelamento = evento.motivoDoCancelamento && (
    <p className="aviso" role="status">
      Evento cancelado. Motivo: {evento.motivoDoCancelamento}
    </p>
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
      <div className="indicadores">
        <Indicador
          rotulo={isMobile ? 'CONSOLIDADO' : 'CUSTO CONSOLIDADO'}
          valor={detalhe.orcamento.consolidado}
        />
        <Indicador
          rotulo={isMobile ? 'PREVISTO' : 'ORÇAMENTO PREVISTO'}
          valor={detalhe.orcamento.previsto}
        />
        <Indicador
          rotulo={isMobile ? 'ECONOMIA' : 'ECONOMIA NAS COTAÇÕES'}
          valor={detalhe.orcamento.economia}
          positivo
        />
      </div>

      <div className="progresso-orcamento">
        <span style={{ width: `${detalhe.orcamento.comprometido}%` }} />
      </div>

      <p className="cartao__apoio">
        {detalhe.orcamento.comprometido}% do orçamento previsto{' '}
        {isMobile ? 'comprometido' : 'já está comprometido'}
      </p>
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
          chave: item.nome,
          titulo: item.nome,
          apoio: isMobile ? undefined : item.categoria,
          etiqueta: ETIQUETA_DA_SITUACAO[item.situacao]?.[isMobile ? 'curta' : 'longa'],
          estiloDaEtiqueta: ETIQUETA_DA_SITUACAO[item.situacao]?.estilo,
          valor: item.valor,
        }))}
      />
    </Cartao>
  )

  const propostas = (
    <Cartao
      titulo="Propostas recebidas"
      link={
        detalhe.propostas.length > 0
          ? {
              para: `/organizador/eventos/${id}/propostas`,
              nome: isMobile ? 'Comparar' : 'Comparar propostas',
            }
          : undefined
      }
    >
      {detalhe.propostas.length === 0 ? (
        <p className="cartao__vazio">Não há propostas</p>
      ) : (
        <ListaDeLinhas
          linhas={(isMobile ? detalhe.propostas.slice(0, 2) : detalhe.propostas).map(
            (proposta) => ({
              chave: proposta.fornecedor,
              titulo: proposta.fornecedor,
              apoio: isMobile ? undefined : proposta.item,
              etiqueta: isMobile ? undefined : proposta.etiqueta,
              estiloDaEtiqueta: 'aprovado',
              valor: proposta.valor,
            }),
          )}
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
        {avisoDeCancelamento}
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
      {avisoDeCancelamento}
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

function Indicador({ rotulo, valor, positivo = false }) {
  const valorLongo = String(valor ?? '').length > 11
  const classeValor = [
    positivo && 'indicador__valor--positivo',
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
