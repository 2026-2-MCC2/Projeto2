import { useEffect, useState } from 'react'
import { OrganizadorLayout } from '../../components/organizador/OrganizadorLayout.jsx'
import { Botao, Campo } from '../../components/organizador/Formulario.jsx'
import { Modal } from '../../components/comum/Modal.jsx'
import { Carregando, ErroNaTela, Vazio } from '../../components/comum/EstadoDaTela.jsx'
import { useIsMobile } from '../../hooks/useIsMobile.js'
import { decidirCadastro, listarCadastrosPendentes } from '../../../infrastructure/aprovacoes.js'
import {
  formatarCnpj,
  formatarData,
  formatarTelefone,
  iniciais,
} from '../../../domain/formatacao.js'
import iconeAprovar from '../../assets/organizador/icone-modal-aceitar.svg'
import iconeRejeitar from '../../assets/admin/icone-modal-rejeitar.svg'
import '../../styles/admin.css'

const ETIQUETAS = {
  organizador: { nome: 'Organizador', variacao: 'cotacao' },
  fornecedor: { nome: 'Fornecedor', variacao: 'planejamento' },
}

// rótulo e formatação de cada dado do cartão
const CAMPOS = {
  cnpj: { rotulo: 'CNPJ', formatar: formatarCnpj },
  areaDeAtuacao: { rotulo: 'Área de atuação', formatar: (area) => area },
  email: { rotulo: 'E-mail', formatar: (email) => email },
  telefone: { rotulo: 'Telefone', formatar: formatarTelefone },
  enviadoEm: { rotulo: 'Enviado em', formatar: formatarData },
}

// No mobile os dados viram duas colunas, o e-mail ocupa a linha inteira e a data de envio sai.
// A área de atuação só existe no fornecedor: no organizador ela sai da lista (ver camposDoCartao).
const ORDEM_DESKTOP = ['cnpj', 'areaDeAtuacao', 'email', 'telefone', 'enviadoEm']
const ORDEM_MOBILE = ['cnpj', 'areaDeAtuacao', 'telefone', 'email']

function camposDoCartao(cadastro, isMobile) {
  const ordem = isMobile ? ORDEM_MOBILE : ORDEM_DESKTOP
  return cadastro.perfil === 'fornecedor'
    ? ordem
    : ordem.filter((campo) => campo !== 'areaDeAtuacao')
}

const RESULTADOS = { aprovar: 'aprovado', rejeitar: 'rejeitado' }

function ModalDecisao({ decisao, cadastro, enviando, aoConfirmar, aoFechar }) {
  const empresa = { rotulo: 'Empresa', valor: cadastro.nome }
  const perfil = { rotulo: 'Perfil', valor: ETIQUETAS[cadastro.perfil].nome }

  if (decisao === 'aprovar') {
    return (
      <Modal
        icone={iconeAprovar}
        corDoIcone="verde"
        titulo="Aprovar este cadastro?"
        mensagem="O usuário passa a acessar a plataforma com o perfil solicitado e recebe um aviso por e-mail."
        dados={[empresa, perfil, { rotulo: 'CNPJ', valor: formatarCnpj(cadastro.cnpj) }]}
        acao={{
          cancelar: 'Cancelar',
          confirmar: enviando ? 'Aprovando...' : 'Aprovar cadastro',
          aoConfirmar: aoConfirmar,
          ocupado: enviando,
        }}
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
      acao={{
        cancelar: 'Cancelar',
        confirmar: enviando ? 'Rejeitando...' : 'Rejeitar cadastro',
        aoConfirmar: aoConfirmar,
        ocupado: enviando,
      }}
      aoFechar={aoFechar}
    >
      <Campo rotulo="Motivo da rejeição">
        <textarea rows={2} placeholder="Ex.: documentação fiscal incompleta." required />
      </Campo>
    </Modal>
  )
}

function CartaoSolicitacao({ cadastro, bloqueado, aoDecidir }) {
  const isMobile = useIsMobile()
  const etiqueta = ETIQUETAS[cadastro.perfil]
  const campos = camposDoCartao(cadastro, isMobile)

  return (
    <article className="solicitacao">
      <div className="fornecedor">
        <span className="fornecedor__avatar" aria-hidden="true">
          {iniciais(cadastro.nome)}
        </span>
        <div className="fornecedor__nome">
          <div className="solicitacao__linha-nome">
            <strong>{cadastro.nome}</strong>
            <span className={`etiqueta etiqueta--${etiqueta.variacao}`}>{etiqueta.nome}</span>
          </div>
        </div>
      </div>

      {/* uma coluna por dado no desktop: 4 no organizador, 5 no fornecedor */}
      <dl className="solicitacao__dados" style={{ '--colunas': campos.length }}>
        {campos.map((campo) => (
          <div key={campo} className={`solicitacao__dado solicitacao__dado--${campo}`}>
            <dt>{CAMPOS[campo].rotulo}</dt>
            <dd>{CAMPOS[campo].formatar(cadastro[campo])}</dd>
          </div>
        ))}
      </dl>

      <div className="solicitacao__acoes">
        <Botao type="button" secundario disabled={bloqueado} onClick={() => aoDecidir('rejeitar')}>
          Recusar
        </Botao>
        <Botao type="button" disabled={bloqueado} onClick={() => aoDecidir('aprovar')}>
          Aprovar
        </Botao>
      </div>
    </article>
  )
}

export function Aprovacoes() {
  const isMobile = useIsMobile()
  // situacao: 'carregando' | 'erro' | 'pronto'
  const [lista, setLista] = useState({ situacao: 'carregando', cadastros: [], temMais: false })
  const [tentativa, setTentativa] = useState(0)
  const [decisao, setDecisao] = useState(null)
  const [enviando, setEnviando] = useState(false)
  // { tipo: 'sucesso' | 'erro', texto }
  const [aviso, setAviso] = useState(null)

  useEffect(() => {
    let ativo = true

    listarCadastrosPendentes()
      .then(({ cadastros, temMais }) => {
        if (ativo) setLista({ situacao: 'pronto', cadastros, temMais })
      })
      .catch((erro) => {
        if (ativo) setLista({ situacao: 'erro', cadastros: [], temMais: false, erro })
      })

    // a tela pode fechar antes da resposta chegar: aí a resposta é ignorada
    return () => {
      ativo = false
    }
  }, [tentativa])

  function tentarDeNovo() {
    setLista({ situacao: 'carregando', cadastros: [], temMais: false })
    setTentativa(tentativa + 1)
  }

  async function confirmarDecisao() {
    const { tipo, cadastro } = decisao
    setEnviando(true)
    setAviso(null)

    try {
      await decidirCadastro(cadastro.chave, tipo)
      setLista((atual) => ({
        ...atual,
        cadastros: atual.cadastros.filter((item) => item.chave !== cadastro.chave),
      }))
      setAviso({ tipo: 'sucesso', texto: `Cadastro de ${cadastro.nome} ${RESULTADOS[tipo]}.` })
    } catch (falha) {
      // ex.: outro admin já decidiu este cadastro ("Esse usuário não pode ter o status alterado.")
      setAviso({ tipo: 'erro', texto: falha.message })
    } finally {
      setEnviando(false)
      setDecisao(null)
    }
  }

  const total = lista.cadastros.length
  const apoio =
    lista.situacao === 'pronto'
      ? `${total} ${total === 1 ? 'solicitação aguardando' : 'solicitações aguardando'} análise`
      : 'Cadastros que aguardam análise'

  return (
    <OrganizadorLayout
      perfil="admin"
      titulo={isMobile ? 'Aprovações' : 'Aprovações de cadastro'}
      apoio={`${apoio}.`}
      apoioMobile={apoio}
    >
      {aviso?.tipo === 'sucesso' && (
        <p className="aviso" role="status">
          {aviso.texto}
        </p>
      )}
      {aviso?.tipo === 'erro' && (
        <p className="mensagem-erro" role="alert">
          {aviso.texto}
        </p>
      )}

      {lista.situacao === 'carregando' && <Carregando mensagem="Carregando solicitações…" />}

      {lista.situacao === 'erro' && <ErroNaTela erro={lista.erro} aoTentarDeNovo={tentarDeNovo} />}

      {lista.situacao === 'pronto' && total === 0 && (
        <Vazio titulo="Nenhum cadastro aguardando aprovação" />
      )}

      {lista.situacao === 'pronto' && total > 0 && (
        <section className="solicitacoes" aria-label="Solicitações pendentes">
          {lista.cadastros.map((cadastro) => (
            <CartaoSolicitacao
              key={cadastro.chave}
              cadastro={cadastro}
              bloqueado={enviando}
              aoDecidir={(tipo) => setDecisao({ tipo, cadastro })}
            />
          ))}
        </section>
      )}

      {lista.temMais && (
        <p className="aviso" role="status">
          Mostrando os 100 cadastros mais antigos. Decida estes para ver os próximos.
        </p>
      )}

      {decisao && (
        <ModalDecisao
          decisao={decisao.tipo}
          cadastro={decisao.cadastro}
          enviando={enviando}
          aoConfirmar={confirmarDecisao}
          aoFechar={() => !enviando && setDecisao(null)}
        />
      )}
    </OrganizadorLayout>
  )
}
