import { useState } from 'react'
import { OrganizadorLayout } from '../../components/organizador/OrganizadorLayout.jsx'
import { Botao, Campo } from '../../components/organizador/Formulario.jsx'
import { Modal } from '../../components/comum/Modal.jsx'
import { useIsMobile } from '../../hooks/useIsMobile.js'
import { SOLICITACOES_PENDENTES } from '../../data/aprovacoes.js'
import iconeAprovar from '../../assets/organizador/icone-modal-aceitar.svg'
import iconeRejeitar from '../../assets/admin/icone-modal-rejeitar.svg'
import '../../styles/admin.css'

const ETIQUETAS = {
  organizador: { nome: 'Organizador', variacao: 'cotacao' },
  fornecedor: { nome: 'Fornecedor', variacao: 'planejamento' },
}

const CAMPOS = {
  cnpj: 'CNPJ',
  responsavel: 'Responsável',
  email: 'E-mail',
  telefone: 'Telefone',
  cidade: 'Cidade',
  enviadoEm: 'Enviado em',
}

// No mobile os dados viram duas colunas, o e-mail ocupa a linha inteira e a data de envio sai.
const ORDEM_DESKTOP = ['cnpj', 'responsavel', 'email', 'telefone', 'cidade', 'enviadoEm']
const ORDEM_MOBILE = ['cnpj', 'cidade', 'responsavel', 'telefone', 'email']

function ModalDecisao({ decisao, solicitacao, aoFechar }) {
  const empresa = { rotulo: 'Empresa', valor: solicitacao.nome }
  const perfil = { rotulo: 'Perfil', valor: ETIQUETAS[solicitacao.perfil].nome }

  if (decisao === 'aprovar') {
    return (
      <Modal
        icone={iconeAprovar}
        corDoIcone="verde"
        titulo="Aprovar este cadastro?"
        mensagem="O usuário passa a acessar a plataforma com o perfil solicitado e recebe um aviso por e-mail."
        dados={[empresa, perfil, { rotulo: 'CNPJ', valor: solicitacao.cnpj }]}
        acao={{ cancelar: 'Cancelar', confirmar: 'Aprovar cadastro' }}
        aoFechar={aoFechar}
      />
    )
  }

  return (
    <Modal
      icone={iconeRejeitar}
      corDoIcone="vermelho"
      titulo="Rejeitar este cadastro?"
      mensagem="O usuário é avisado de que o cadastro não foi aprovado. Informe o motivo para que ele possa corrigir e enviar de novo."
      dados={[empresa, perfil]}
      acao={{ cancelar: 'Cancelar', confirmar: 'Rejeitar cadastro' }}
      aoFechar={aoFechar}
    >
      <Campo rotulo="Motivo da rejeição">
        <textarea rows={2} placeholder="Ex.: documentação fiscal incompleta." />
      </Campo>
    </Modal>
  )
}

function CartaoSolicitacao({ solicitacao, aoDecidir }) {
  const isMobile = useIsMobile()
  const etiqueta = ETIQUETAS[solicitacao.perfil]

  return (
    <article className="solicitacao">
      <div className="fornecedor">
        <span className="fornecedor__avatar">{solicitacao.sigla}</span>
        <div className="fornecedor__nome">
          <div className="solicitacao__linha-nome">
            <strong>{solicitacao.nome}</strong>
            <span className={`etiqueta etiqueta--${etiqueta.variacao}`}>{etiqueta.nome}</span>
          </div>
          <small>{solicitacao.atuacao}</small>
        </div>
      </div>

      <dl className="solicitacao__dados">
        {(isMobile ? ORDEM_MOBILE : ORDEM_DESKTOP).map((campo) => (
          <div key={campo} className={`solicitacao__dado solicitacao__dado--${campo}`}>
            <dt>{CAMPOS[campo]}</dt>
            <dd>{solicitacao[campo]}</dd>
          </div>
        ))}
      </dl>

      <div className="solicitacao__acoes">
        <Botao type="button" secundario onClick={() => aoDecidir('rejeitar')}>
          Recusar
        </Botao>
        <Botao type="button" onClick={() => aoDecidir('aprovar')}>
          Aprovar
        </Botao>
      </div>
    </article>
  )
}

export function Aprovacoes() {
  const isMobile = useIsMobile()
  const [decisao, setDecisao] = useState(null)
  const total = SOLICITACOES_PENDENTES.length
  const apoio = `${total} ${total === 1 ? 'solicitação aguardando' : 'solicitações aguardando'} análise`

  return (
    <OrganizadorLayout
      perfil="admin"
      titulo={isMobile ? 'Aprovações' : 'Aprovações de cadastro'}
      apoio={`${apoio}.`}
      apoioMobile={apoio}
    >
      <section className="solicitacoes" aria-label="Solicitações pendentes">
        {SOLICITACOES_PENDENTES.map((solicitacao) => (
          <CartaoSolicitacao
            key={solicitacao.id}
            solicitacao={solicitacao}
            aoDecidir={(tipo) => setDecisao({ tipo, solicitacao })}
          />
        ))}
      </section>

      {decisao && (
        <ModalDecisao
          decisao={decisao.tipo}
          solicitacao={decisao.solicitacao}
          aoFechar={() => setDecisao(null)}
        />
      )}
    </OrganizadorLayout>
  )
}
