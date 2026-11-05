import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { formatarMoeda, formatarPeriodo } from '../../../application/eventos.js'
import {
  buscarMinhaProposta,
  formatarValidade,
  propostaPodeSerAlterada,
  retirarProposta,
} from '../../../application/propostas.js'
import { formatarData } from '../../../domain/formatacao.js'
import { Carregando, ErroNaTela, Vazio } from '../../components/comum/EstadoDaTela.jsx'
import { Modal } from '../../components/comum/Modal.jsx'
import { EtiquetaDaProposta } from '../../components/fornecedor/EtiquetaDaProposta.jsx'
import { Botao } from '../../components/organizador/Formulario.jsx'
import { OrganizadorLayout } from '../../components/organizador/OrganizadorLayout.jsx'
import { toast } from '../../toasts.js'
import iconeRetirar from '../../assets/admin/icone-modal-rejeitar.svg'
import '../../styles/fornecedor.css'

const VOLTAR_PARA = '/fornecedor/propostas'

// campos de texto da proposta, na ordem em que o fornecedor preenche nas etapas
const CAMPOS_DE_TEXTO = [
  { campo: 'description', rotulo: 'Descrição do serviço' },
  { campo: 'not_included', rotulo: 'O que não está incluído' },
  { campo: 'delivery_terms', rotulo: 'Prazo de entrega ou montagem' },
  { campo: 'payment_terms', rotulo: 'Condição de pagamento' },
  { campo: 'team', rotulo: 'Equipe envolvida' },
  { campo: 'warranty', rotulo: 'Garantia ou substituição' },
  { campo: 'notes', rotulo: 'Observações' },
]

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
      toast.sucesso('Proposta retirada', { descricao: resultado.proposta.item.description })
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
      voltarPara={VOLTAR_PARA}
    >
      <div className="fornecedor-evento-detalhe">
        <section className="painel" aria-labelledby="proposta-resumo-titulo">
          <div className="painel__titulo">
            <h2 id="proposta-resumo-titulo">Sua proposta</h2>
            <EtiquetaDaProposta status={proposta.status} />
          </div>
          <dl className="fornecedor-evento-detalhe__dados">
            <div>
              <dt>Valor</dt>
              <dd>{formatarMoeda(proposta.amount)}</dd>
            </div>
            <div>
              <dt>Válida até</dt>
              <dd>{formatarValidade(proposta.valid_until)}</dd>
            </div>
            <div>
              <dt>Enviada em</dt>
              <dd>{formatarData(proposta.sent_at)}</dd>
            </div>
            <div>
              <dt>Escolhida pelo organizador</dt>
              <dd>{proposta.selected ? 'Sim' : 'Não'}</dd>
            </div>
          </dl>

          {podeAlterar ? (
            <div className="detalhe-proposta__acoes">
              <Botao type="button" perigo onClick={() => setConfirmandoRetirada(true)}>
                Retirar proposta
              </Botao>
              <Link to={rotaDeEdicao} className="botao">
                Editar
              </Link>
            </div>
          ) : (
            <p className="aviso" role="note">
              {proposta.status === 'sent'
                ? 'O evento não está mais em cotação: a proposta não pode ser editada nem retirada.'
                : 'O organizador já analisou esta proposta: ela fica disponível só para consulta.'}
            </p>
          )}
        </section>

        <section className="painel" aria-labelledby="proposta-item-titulo">
          <div className="painel__titulo">
            <h2 id="proposta-item-titulo">Item e evento</h2>
          </div>
          <dl className="fornecedor-evento-detalhe__dados">
            <div>
              <dt>Item</dt>
              <dd>
                {proposta.item.description} · {proposta.item.category} ·{' '}
                {proposta.item.type === 'product' ? 'Produto' : 'Serviço'}, quantidade{' '}
                {proposta.item.quantity}
              </dd>
            </div>
            <div>
              <dt>Evento</dt>
              <dd>{proposta.event.name}</dd>
            </div>
            <div>
              <dt>Fim do evento</dt>
              <dd>{formatarPeriodo(proposta.event.end_date, proposta.event.end_date)}</dd>
            </div>
          </dl>
        </section>

        <section className="painel" aria-labelledby="proposta-detalhes-titulo">
          <div className="painel__titulo">
            <h2 id="proposta-detalhes-titulo">Detalhes</h2>
          </div>
          <dl className="fornecedor-evento-detalhe__dados">
            {CAMPOS_DE_TEXTO.filter(({ campo }) => proposta[campo]).map(({ campo, rotulo }) => (
              <div key={campo}>
                <dt>{rotulo}</dt>
                <dd className="detalhe-proposta__texto">{proposta[campo]}</dd>
              </div>
            ))}
          </dl>
        </section>

        {proposta.photos?.length > 0 && (
          <section className="painel" aria-labelledby="proposta-fotos-titulo">
            <div className="painel__titulo">
              <h2 id="proposta-fotos-titulo">Fotos do serviço</h2>
            </div>
            <div className="proposta-detalhes__galeria">
              {proposta.photos.map((foto, indice) => (
                <img
                  key={foto.photo_key}
                  src={foto.url}
                  alt={`Foto ${indice + 1} do serviço`}
                  className="proposta-detalhes__foto"
                />
              ))}
            </div>
          </section>
        )}
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
