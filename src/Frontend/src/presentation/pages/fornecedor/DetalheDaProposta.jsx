import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { formatarMoeda, formatarPeriodo } from '../../../application/eventos.js'
import {
  buscarMinhaProposta,
  formatarValidade,
  propostaPodeSerAlterada,
  retirarProposta,
} from '../../../application/propostas.js'
import { descartarRascunho } from '../../../application/rascunhosDePropostas.js'
import { formatarData } from '../../../domain/formatacao.js'
import { Carregando, ErroNaTela, Vazio } from '../../components/comum/EstadoDaTela.jsx'
import { Modal } from '../../components/comum/Modal.jsx'
import { EtiquetaDaProposta } from '../../components/fornecedor/EtiquetaDaProposta.jsx'
import { FotoDoServico } from '../../components/fornecedor/FotoDoServico.jsx'
import { Cartao } from '../../components/organizador/Cartao.jsx'
import { Botao } from '../../components/organizador/Formulario.jsx'
import { OrganizadorLayout } from '../../components/organizador/OrganizadorLayout.jsx'
import { toast } from '../../toasts.js'
import iconeRetirar from '../../assets/admin/icone-modal-rejeitar.svg'
import { ENTRAR_NA_EDICAO } from '../../hooks/usePropostaEmEdicao.js'
import { useRenovarFotosVencidas } from '../../hooks/useRenovarFotosVencidas.js'
import '../../styles/fornecedor.css'

const VOLTAR_PARA = '/fornecedor/propostas'

// textos livres da proposta, na ordem em que o fornecedor preenche nas etapas
const TEXTOS_DA_DESCRICAO = [
  { campo: 'description', rotulo: 'O que está incluído' },
  { campo: 'not_included', rotulo: 'O que não está incluído' },
  { campo: 'team', rotulo: 'Equipe envolvida' },
  { campo: 'warranty', rotulo: 'Garantia ou substituição' },
  { campo: 'notes', rotulo: 'Observações' },
]

const EXPLICACAO_DA_SITUACAO = {
  sent: 'O organizador ainda não decidiu sobre as propostas deste item.',
  under_review: 'O organizador está comparando as propostas recebidas para este item.',
  accepted: 'O organizador escolheu a sua proposta para este item.',
  rejected: 'O organizador escolheu outra proposta para este item.',
  canceled: 'O organizador cancelou o evento e as propostas dele foram encerradas.',
}

function ModalRetirar({ proposta, retirando, aoConfirmar, aoFechar }) {
  return (
    <Modal
      icone={iconeRetirar}
      corDoIcone="vermelho"
      titulo="Retirar esta proposta?"
      mensagem="Ela some da comparação do organizador. Enquanto o evento estiver em cotação, você pode enviar uma nova proposta para o item."
      dados={[
        { rotulo: 'Item', valor: proposta.item.description },
        { rotulo: 'Valor', valor: formatarMoeda(proposta.amount) },
      ]}
      acao={{
        cancelar: 'Cancelar',
        confirmar: retirando ? 'Retirando...' : 'Retirar proposta',
        aoConfirmar: aoConfirmar,
        ocupado: retirando,
      }}
      aoFechar={aoFechar}
    />
  )
}

// Detalhe de uma proposta do fornecedor (GET /supplier/proposals/:proposal_key).
// Editar e Retirar só aparecem enquanto ela está Enviada e o evento continua em cotação.
export function DetalheDaProposta() {
  const { proposalKey } = useParams()
  const navigate = useNavigate()
  const [tentativa, setTentativa] = useState(0)
  const [resultado, setResultado] = useState({ chave: null, proposta: null, erro: null })
  const [confirmandoRetirada, setConfirmandoRetirada] = useState(false)
  const [retirando, setRetirando] = useState(false)
  const carregando = resultado.chave !== proposalKey
  // só as fotos são trocadas: se o pedido falhar, a página continua como estava
  const aoFalharFoto = useRenovarFotosVencidas(() =>
    buscarMinhaProposta(proposalKey)
      .then((atualizada) =>
        setResultado((atual) =>
          atual.chave === proposalKey && atual.proposta
            ? { ...atual, proposta: { ...atual.proposta, photos: atualizada.photos } }
            : atual,
        ),
      )
      .catch(() => {}),
  )

  useEffect(() => {
    let telaAberta = true
    buscarMinhaProposta(proposalKey)
      .then((proposta) => {
        if (telaAberta) setResultado({ chave: proposalKey, proposta, erro: null })
      })
      .catch((erro) => {
        if (telaAberta) setResultado({ chave: proposalKey, proposta: null, erro })
      })

    return () => {
      telaAberta = false
    }
  }, [proposalKey, tentativa])

  async function confirmarRetirada() {
    setRetirando(true)
    try {
      await retirarProposta(proposalKey)
      const { event, item } = resultado.proposta
      // a edição deixada pela metade não pode virar o começo da proposta nova para o item
      descartarRascunho(event.event_key, item.item_key)
      toast.sucesso('Proposta retirada', { descricao: item.description })
      navigate(VOLTAR_PARA, { replace: true })
    } catch (falha) {
      // ex.: o organizador aceitou ou recusou no meio tempo ("…não pode mais ser alterada nem retirada.")
      toast.erro('Não foi possível retirar a proposta', { descricao: falha.message })
      setRetirando(false)
      setConfirmandoRetirada(false)
      setTentativa((valor) => valor + 1)
    }
  }

  if (carregando) {
    return (
      <OrganizadorLayout perfil="fornecedor" titulo="Proposta" voltarPara={VOLTAR_PARA}>
        <Carregando mensagem="Carregando a proposta…" />
      </OrganizadorLayout>
    )
  }

  if (resultado.erro) {
    return (
      <OrganizadorLayout perfil="fornecedor" titulo="Proposta" voltarPara={VOLTAR_PARA}>
        {resultado.erro.status === 404 ? (
          <Vazio
            icone="atencao"
            titulo="Proposta não encontrada"
            mensagem="Ela pode ter sido retirada. Confira suas propostas na lista."
          >
            <Link to={VOLTAR_PARA} className="botao botao--secundario">
              Ver minhas propostas
            </Link>
          </Vazio>
        ) : (
          <ErroNaTela
            erro={resultado.erro}
            aoTentarDeNovo={() => setTentativa((valor) => valor + 1)}
          />
        )}
      </OrganizadorLayout>
    )
  }

  const proposta = resultado.proposta
  const podeAlterar = propostaPodeSerAlterada(proposta)
  const rotaDeEdicao = `/fornecedor/eventos/${proposta.event.event_key}/itens/${proposta.item.item_key}/propostas/etapa-1`

  return (
    <OrganizadorLayout
      perfil="fornecedor"
      titulo={proposta.item.description}
      sobreTitulo={`Minhas propostas · ${proposta.event.name}`}
      apoio={`Proposta enviada em ${formatarData(proposta.sent_at)}`}
      voltarPara={VOLTAR_PARA}
    >
      <div className="colunas detalhe-proposta">
        <div className="colunas__principal">
          <Cartao titulo="Valores e prazos">
            <LinhasDeDados linhas={valoresEPrazos(proposta)} />
          </Cartao>

          <Cartao titulo="Descrição enviada">
            <div className="detalhe-proposta__textos">
              {TEXTOS_DA_DESCRICAO.filter(({ campo }) => proposta[campo]).map(
                ({ campo, rotulo }) => (
                  <div key={campo}>
                    <h3>{rotulo}</h3>
                    <p>{proposta[campo]}</p>
                  </div>
                ),
              )}
            </div>
          </Cartao>

          {proposta.photos?.length > 0 && (
            <Cartao titulo="Fotos enviadas">
              <div className="proposta-detalhes__galeria">
                {proposta.photos.map((foto, indice) => (
                  <FotoDoServico
                    key={foto.photo_key}
                    foto={foto}
                    indice={indice}
                    aoFalharFoto={aoFalharFoto}
                  />
                ))}
              </div>
            </Cartao>
          )}
        </div>

        <aside className="colunas__lateral">
          <Cartao titulo="Situação">
            <div className="detalhe-proposta__situacao">
              <EtiquetaDaProposta status={proposta.status} />
              <p>{EXPLICACAO_DA_SITUACAO[proposta.status]}</p>
            </div>
            <LinhasDeDados
              linhas={[
                { rotulo: 'Enviada em', valor: formatarData(proposta.sent_at) },
                {
                  rotulo: 'Fim do evento',
                  valor: formatarPeriodo(proposta.event.end_date, proposta.event.end_date),
                },
              ]}
            />
          </Cartao>

          <div className="detalhe-proposta__acoes">
            {podeAlterar && (
              <>
                <Link to={rotaDeEdicao} state={ENTRAR_NA_EDICAO} className="botao">
                  Editar proposta
                </Link>
                <Botao type="button" secundario onClick={() => setConfirmandoRetirada(true)}>
                  Retirar proposta
                </Botao>
              </>
            )}
            <Link to={VOLTAR_PARA} className="detalhe-proposta__voltar">
              Voltar para a lista
            </Link>
          </div>

          <AvisoDaProposta proposta={proposta} podeAlterar={podeAlterar} />
        </aside>
      </div>

      {confirmandoRetirada && (
        <ModalRetirar
          proposta={proposta}
          retirando={retirando}
          aoConfirmar={confirmarRetirada}
          aoFechar={() => !retirando && setConfirmandoRetirada(false)}
        />
      )}
    </OrganizadorLayout>
  )
}

function valoresEPrazos(proposta) {
  return [
    { rotulo: 'Valor da proposta', valor: formatarMoeda(proposta.amount) },
    proposta.item.estimated_value != null && {
      rotulo: 'Orçamento previsto pelo organizador',
      valor: formatarMoeda(proposta.item.estimated_value),
    },
    { rotulo: 'Validade da proposta', valor: formatarValidade(proposta.valid_until) },
    { rotulo: 'Prazo de entrega ou montagem', valor: proposta.delivery_terms },
    { rotulo: 'Condição de pagamento', valor: proposta.payment_terms },
  ].filter(Boolean)
}

function LinhasDeDados({ linhas }) {
  return (
    <dl className="linhas-de-dados">
      {linhas.map(({ rotulo, valor }) => (
        <div key={rotulo}>
          <dt>{rotulo}</dt>
          <dd>{valor}</dd>
        </div>
      ))}
    </dl>
  )
}

function contatoDoOrganizador({ name, email, phone }) {
  return [name, email, phone].filter(Boolean).join(' · ')
}

function AvisoDaProposta({ proposta, podeAlterar }) {
  const contato = proposta.organizer_contact && contatoDoOrganizador(proposta.organizer_contact)

  if (proposta.status === 'canceled') {
    const motivo = proposta.event.cancellation_reason
    return (
      <p className="aviso aviso--perigo" role="note">
        {motivo ? `Motivo: ${motivo.replace(/[.!]+$/, '')}. ` : ''}
        {contato
          ? `Se você já teve custos com este evento, fale com o organizador: ${contato}`
          : 'O organizador cancelou o evento.'}
      </p>
    )
  }
  if (proposta.status === 'accepted') {
    return (
      <p className="aviso aviso--sucesso" role="note">
        Combine a entrega com o organizador{contato ? `: ${contato}` : '.'}
      </p>
    )
  }
  if (podeAlterar) {
    return (
      <p className="aviso aviso--alerta" role="note">
        A edição e a retirada ficam disponíveis enquanto o organizador não decidir e o evento
        estiver em cotação.
      </p>
    )
  }
  return (
    <p className="aviso aviso--neutro" role="note">
      {proposta.status === 'sent'
        ? 'O evento não está mais em cotação: a proposta não pode ser editada nem retirada.'
        : 'Esta proposta fica disponível só para consulta.'}
    </p>
  )
}
