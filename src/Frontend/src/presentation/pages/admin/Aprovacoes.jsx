import { useEffect, useRef, useState } from 'react'
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
import { toast } from '../../toasts.js'
import '../../styles/admin.css'

const ETIQUETAS = {
  organizador: { nome: 'Organizador', variacao: 'cotacao' },
  fornecedor: { nome: 'Fornecedor', variacao: 'planejamento' },
}

const CAMPOS = {
  cnpj: { rotulo: 'CNPJ', formatar: formatarCnpj },
  categorias: { rotulo: 'Categorias', formatar: (categorias) => categorias.join(', ') },
  email: { rotulo: 'E-mail', formatar: (email) => email },
  telefone: { rotulo: 'Telefone', formatar: formatarTelefone },
  enviadoEm: { rotulo: 'Enviado em', formatar: formatarData },
}

// no mobile a data de envio sai
const ORDEM_DESKTOP = ['cnpj', 'categorias', 'email', 'telefone', 'enviadoEm']
const ORDEM_MOBILE = ['cnpj', 'categorias', 'telefone', 'email']

function camposDoCartao(cadastro, isMobile) {
  const ordem = isMobile ? ORDEM_MOBILE : ORDEM_DESKTOP
  return cadastro.perfil === 'fornecedor' ? ordem : ordem.filter((campo) => campo !== 'categorias')
}

const RESULTADOS = { aprovar: 'aprovado', rejeitar: 'rejeitado' }

function ModalDecisao({ decisao, cadastro, enviando, aoConfirmar, aoFechar }) {
  const [motivo, setMotivo] = useState('')
  const empresa = { rotulo: 'Empresa', valor: cadastro.nome }
  const perfil = { rotulo: 'Perfil', valor: ETIQUETAS[cadastro.perfil].nome }

  if (decisao === 'aprovar') {
    return (
      <Modal
        icone={iconeAprovar}
        corDoIcone="verde"
        titulo="Aprovar este cadastro?"
        mensagem="O usuário passa a acessar a plataforma com o perfil solicitado."
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
      mensagem="O usuário não consegue entrar enquanto o cadastro estiver rejeitado. O motivo fica registrado no histórico de decisões."
      dados={[empresa, perfil]}
      acao={{
        cancelar: 'Cancelar',
        confirmar: enviando ? 'Rejeitando...' : 'Rejeitar cadastro',
        aoConfirmar: () => aoConfirmar(motivo),
        ocupado: enviando,
      }}
      aoFechar={aoFechar}
    >
      <Campo rotulo="Motivo da rejeição">
        <textarea
          rows={2}
          maxLength={500}
          placeholder="Ex.: documentação fiscal incompleta."
          value={motivo}
          onChange={(evento) => setMotivo(evento.target.value)}
          required
        />
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
  const [atualizando, setAtualizando] = useState(false)
  const listaJaCarregou = useRef(false)
  const [decisao, setDecisao] = useState(null)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    let telaAberta = true

    listarCadastrosPendentes()
      .then(({ cadastros, temMais }) => {
        if (!telaAberta) return
        listaJaCarregou.current = true
        setLista({ situacao: 'pronto', cadastros, temMais })
      })
      .catch((erro) => {
        if (!telaAberta) return
        // com a lista já na tela, uma falha ao atualizar vira toast em vez de esconder os cadastros
        if (listaJaCarregou.current)
          toast.erro('Não foi possível atualizar a lista', { descricao: erro.message })
        else setLista({ situacao: 'erro', cadastros: [], temMais: false, erro })
      })
      .finally(() => {
        if (telaAberta) setAtualizando(false)
      })

    return () => {
      telaAberta = false
    }
  }, [tentativa])

  // a lista só é buscada ao abrir a tela: ao voltar para a aba, busca de novo para mostrar cadastros novos
  useEffect(() => {
    function atualizarAoVoltarParaAba() {
      if (document.visibilityState === 'visible') atualizarLista()
    }

    document.addEventListener('visibilitychange', atualizarAoVoltarParaAba)
    return () => document.removeEventListener('visibilitychange', atualizarAoVoltarParaAba)
  }, [])

  function atualizarLista() {
    setAtualizando(true)
    setTentativa((atual) => atual + 1)
  }

  function tentarDeNovo() {
    setLista({ situacao: 'carregando', cadastros: [], temMais: false })
    setTentativa((atual) => atual + 1)
  }

  async function confirmarDecisao(motivo) {
    const { tipo, cadastro } = decisao
    setEnviando(true)

    try {
      await decidirCadastro(cadastro.chave, tipo, motivo)
      setLista((atual) => ({
        ...atual,
        cadastros: atual.cadastros.filter((item) => item.chave !== cadastro.chave),
      }))
      toast.sucesso(`Cadastro ${RESULTADOS[tipo]}`, { descricao: cadastro.nome })
      // decidiu o último da página e há mais pendentes: busca os próximos
      if (lista.cadastros.length === 1 && lista.temMais) atualizarLista()
    } catch (falha) {
      // ex.: outro admin já decidiu este cadastro
      toast.erro('Não foi possível concluir a decisão', { descricao: falha.message })
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
      {lista.situacao === 'pronto' && (
        <div className="aprovacoes__barra">
          <Botao type="button" secundario disabled={atualizando} onClick={atualizarLista}>
            {atualizando ? 'Atualizando…' : 'Atualizar lista'}
          </Botao>
        </div>
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
