import { useEffect, useState } from 'react'
import { OrganizadorLayout } from '../../components/organizador/OrganizadorLayout.jsx'
import { Botao, Campo } from '../../components/organizador/Formulario.jsx'
import { Modal } from '../../components/comum/Modal.jsx'
import { Carregando, ErroNaTela } from '../../components/comum/EstadoDaTela.jsx'
import { useIsMobile } from '../../hooks/useIsMobile.js'
import { Icone } from '../../components/comum/Icone.jsx'
import { iniciais } from '../../../domain/formatacao.js'
import {
  bloquearUsuario,
  enviarRedefinicaoDeSenha,
  listarUsuariosComAcesso,
  reativarUsuario,
} from '../../../infrastructure/usuarios.js'
import { toast } from '../../toasts.js'
import iconeBuscar from '../../assets/organizador/icone-buscar.svg'
import iconeConfirmar from '../../assets/organizador/icone-modal-aceitar.svg'
import iconeBloquear from '../../assets/admin/icone-modal-rejeitar.svg'
import '../../styles/admin.css'

const FILTROS = [
  { id: 'todos', nome: 'Todos' },
  { id: 'ativo', nome: 'Ativos' },
  { id: 'bloqueado', nome: 'Bloqueados' },
]

const PERFIS = { organizador: 'Organizador', fornecedor: 'Fornecedor' }

const STATUS = {
  ativo: { nome: 'Ativo', variacao: 'cotacao' },
  bloqueado: { nome: 'Bloqueado', variacao: 'vencida' },
}

function resumo(filtro, total) {
  const plural = total === 1 ? '' : 's'
  if (filtro === 'ativo') return `${total} cadastro${plural} ativo${plural}`
  if (filtro === 'bloqueado') return `${total} cadastro${plural} bloqueado${plural}`
  return `${total} cadastro${plural} com acesso à plataforma`
}

const ACOES = {
  redefinir: {
    executar: (usuario) => enviarRedefinicaoDeSenha(usuario.chave),
    sucesso: 'E-mail de redefinição enviado',
    statusDepois: 'ativo',
  },
  bloquear: {
    executar: (usuario, motivo) => bloquearUsuario(usuario.chave, motivo),
    sucesso: 'Acesso bloqueado',
    statusDepois: 'bloqueado',
  },
  reativar: {
    executar: (usuario) => reativarUsuario(usuario.chave),
    sucesso: 'Acesso reativado',
    statusDepois: 'ativo',
  },
}

function ModalAcesso({ acao, usuario, enviando, aoConfirmar, aoFechar }) {
  const [motivo, setMotivo] = useState('')
  const empresa = { rotulo: 'Empresa', valor: usuario.nome }
  const perfil = { rotulo: 'Perfil', valor: PERFIS[usuario.perfil] }

  if (acao === 'redefinir') {
    return (
      <Modal
        icone={iconeConfirmar}
        titulo="Enviar e-mail de redefinição de senha?"
        mensagem="O usuário recebe um link para criar uma nova senha. O link expira em 1 hora."
        dados={[empresa, { rotulo: 'E-mail', valor: usuario.email }]}
        acao={{
          cancelar: 'Cancelar',
          confirmar: enviando ? 'Enviando...' : 'Enviar e-mail',
          aoConfirmar: aoConfirmar,
          ocupado: enviando,
        }}
        aoFechar={aoFechar}
      />
    )
  }

  if (acao === 'reativar') {
    return (
      <Modal
        icone={iconeConfirmar}
        titulo="Reativar o acesso deste usuário?"
        mensagem="O usuário volta a conseguir entrar na plataforma imediatamente com o mesmo perfil de antes."
        dados={[empresa, perfil]}
        acao={{
          cancelar: 'Cancelar',
          confirmar: enviando ? 'Reativando...' : 'Reativar acesso',
          aoConfirmar: aoConfirmar,
          ocupado: enviando,
        }}
        aoFechar={aoFechar}
      />
    )
  }

  return (
    <Modal
      icone={iconeBloquear}
      corDoIcone="vermelho"
      titulo="Bloquear o acesso deste usuário?"
      mensagem="O usuário deixa de conseguir entrar na plataforma até que o acesso seja reativado por um administrador. Ele recebe o motivo por e-mail."
      dados={[empresa, perfil]}
      acao={{
        cancelar: 'Cancelar',
        confirmar: enviando ? 'Bloqueando...' : 'Bloquear acesso',
        aoConfirmar: () => aoConfirmar(motivo.trim()),
        ocupado: enviando,
      }}
      aoFechar={aoFechar}
    >
      <Campo rotulo="Motivo do bloqueio">
        <textarea
          rows={2}
          maxLength={500}
          placeholder="Ex.: inatividade prolongada ou irregularidade identificada."
          value={motivo}
          onChange={(evento) => setMotivo(evento.target.value)}
          required
        />
      </Campo>
    </Modal>
  )
}

function CartaoUsuario({ usuario, ocupado, aoAgir }) {
  const status = STATUS[usuario.status]

  return (
    <article className="usuario">
      <span className="fornecedor__avatar usuario__avatar" aria-hidden="true">
        {iniciais(usuario.nome)}
      </span>

      <div className="usuario__nome">
        <strong>{usuario.nome}</strong>
        <span className="etiqueta usuario__perfil">{PERFIS[usuario.perfil]}</span>
      </div>

      <p className="usuario__contato">
        {usuario.email}
        {usuario.cidade && (
          <>
            <span aria-hidden="true"> · </span>
            {usuario.cidade}
          </>
        )}
      </p>

      <span className={`etiqueta etiqueta--${status.variacao} usuario__status`}>{status.nome}</span>

      <div className="usuario__acoes">
        {usuario.status === 'ativo' ? (
          <>
            <Botao
              type="button"
              secundario
              className="usuario__acao"
              disabled={ocupado}
              onClick={() => aoAgir('redefinir')}
            >
              Redefinir senha
            </Botao>
            <Botao
              type="button"
              secundario
              className="usuario__acao usuario__acao--perigo"
              disabled={ocupado}
              onClick={() => aoAgir('bloquear')}
            >
              Bloquear acesso
            </Botao>
          </>
        ) : (
          <Botao
            type="button"
            secundario
            className="usuario__acao"
            disabled={ocupado}
            onClick={() => aoAgir('reativar')}
          >
            Reativar acesso
          </Botao>
        )}
      </div>
    </article>
  )
}

export function Usuarios() {
  const isMobile = useIsMobile()
  // situacao: 'carregando' | 'erro' | 'pronto'
  const [lista, setLista] = useState({ situacao: 'carregando', usuarios: [], temMais: false })
  const [tentativa, setTentativa] = useState(0)
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState('todos')
  const [confirmacao, setConfirmacao] = useState(null)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    let telaAberta = true

    listarUsuariosComAcesso()
      .then(({ usuarios, temMais }) => {
        if (telaAberta) setLista({ situacao: 'pronto', usuarios, temMais })
      })
      .catch((erro) => {
        if (telaAberta) setLista({ situacao: 'erro', usuarios: [], temMais: false, erro })
      })

    return () => {
      telaAberta = false
    }
  }, [tentativa])

  function tentarDeNovo() {
    setLista({ situacao: 'carregando', usuarios: [], temMais: false })
    setTentativa((atual) => atual + 1)
  }

  async function confirmarAcao(motivo) {
    const { acao, usuario } = confirmacao
    const { executar, sucesso, statusDepois } = ACOES[acao]
    setEnviando(true)

    try {
      await executar(usuario, motivo)
      setLista((atual) => ({
        ...atual,
        usuarios: atual.usuarios.map((item) =>
          item.chave === usuario.chave ? { ...item, status: statusDepois } : item,
        ),
      }))
      toast.sucesso(sucesso, { descricao: usuario.nome })
    } catch (falha) {
      toast.erro('Não foi possível concluir a ação', { descricao: falha.message })
    } finally {
      setEnviando(false)
      setConfirmacao(null)
    }
  }

  const doFiltro = lista.usuarios.filter(
    (usuario) => filtro === 'todos' || usuario.status === filtro,
  )
  const termo = busca.trim().toLocaleLowerCase('pt-BR')
  const usuarios = doFiltro.filter((usuario) =>
    `${usuario.nome} ${usuario.responsavel ?? ''} ${usuario.email}`
      .toLocaleLowerCase('pt-BR')
      .includes(termo),
  )
  const apoio =
    lista.situacao === 'pronto'
      ? resumo(filtro, doFiltro.length)
      : 'Cadastros com acesso à plataforma'

  const filtros = (
    <div className="barra__filtros" aria-label="Filtrar por situação">
      {FILTROS.map((opcao) => (
        <button
          key={opcao.id}
          type="button"
          className={`filtro${filtro === opcao.id ? ' filtro--ativo' : ''}`}
          aria-pressed={filtro === opcao.id}
          onClick={() => setFiltro(opcao.id)}
        >
          {opcao.nome}
        </button>
      ))}
    </div>
  )

  return (
    <OrganizadorLayout
      perfil="admin"
      titulo={isMobile ? 'Usuários' : 'Gestão de usuários'}
      apoio={`${apoio}.`}
      apoioMobile={apoio}
      acoes={filtros}
    >
      <div className="barra">
        <label className="barra__busca">
          <Icone src={iconeBuscar} />
          <input
            type="search"
            aria-label="Buscar usuário"
            placeholder={isMobile ? 'Buscar por empresa' : 'Buscar por empresa ou responsável'}
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
          />
        </label>

        {isMobile && filtros}
      </div>

      {lista.situacao === 'carregando' && <Carregando mensagem="Carregando usuários…" />}

      {lista.situacao === 'erro' && <ErroNaTela erro={lista.erro} aoTentarDeNovo={tentarDeNovo} />}

      {lista.situacao === 'pronto' &&
        (usuarios.length ? (
          <section className="usuarios" aria-label="Usuários">
            {usuarios.map((usuario) => (
              <CartaoUsuario
                key={usuario.chave}
                usuario={usuario}
                ocupado={enviando}
                aoAgir={(acao) => setConfirmacao({ acao, usuario })}
              />
            ))}
          </section>
        ) : (
          <p className="aviso" role="status">
            Nenhum cadastro encontrado para essa busca.
          </p>
        ))}

      {lista.temMais && (
        <p className="aviso" role="status">
          Mostrando os 100 cadastros mais antigos de cada situação.
        </p>
      )}

      {confirmacao && (
        <ModalAcesso
          acao={confirmacao.acao}
          usuario={confirmacao.usuario}
          enviando={enviando}
          aoConfirmar={confirmarAcao}
          aoFechar={() => !enviando && setConfirmacao(null)}
        />
      )}
    </OrganizadorLayout>
  )
}
