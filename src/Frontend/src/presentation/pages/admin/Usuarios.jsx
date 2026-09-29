import { useState } from 'react'
import { OrganizadorLayout } from '../../components/organizador/OrganizadorLayout.jsx'
import { Botao } from '../../components/organizador/Formulario.jsx'
import { useIsMobile } from '../../hooks/useIsMobile.js'
import { USUARIOS } from '../../data/usuarios.js'
import iconeBuscar from '../../assets/organizador/icone-buscar.svg'
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

function CartaoUsuario({ usuario }) {
  const status = STATUS[usuario.status]

  return (
    <article className="usuario">
      <span className="fornecedor__avatar usuario__avatar">{usuario.sigla}</span>

      <div className="usuario__nome">
        <strong>{usuario.nome}</strong>
        <span className="etiqueta usuario__perfil">{PERFIS[usuario.perfil]}</span>
      </div>

      <p className="usuario__contato">
        {usuario.email}
        <span aria-hidden="true"> · </span>
        {usuario.cidade}
      </p>

      <span className={`etiqueta etiqueta--${status.variacao} usuario__status`}>{status.nome}</span>

      <div className="usuario__acoes">
        {usuario.status === 'ativo' ? (
          <>
            <Botao type="button" secundario className="usuario__acao">
              Redefinir senha
            </Botao>
            <Botao type="button" secundario className="usuario__acao usuario__acao--perigo">
              Bloquear acesso
            </Botao>
          </>
        ) : (
          <Botao type="button" secundario className="usuario__acao">
            Reativar acesso
          </Botao>
        )}
      </div>
    </article>
  )
}

export function Usuarios() {
  const isMobile = useIsMobile()
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState('todos')

  const doFiltro = USUARIOS.filter((usuario) => filtro === 'todos' || usuario.status === filtro)
  const termo = busca.trim().toLocaleLowerCase('pt-BR')
  const usuarios = doFiltro.filter((usuario) =>
    `${usuario.nome} ${usuario.responsavel} ${usuario.email}`
      .toLocaleLowerCase('pt-BR')
      .includes(termo),
  )
  const apoio = resumo(filtro, doFiltro.length)

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
          <img src={iconeBuscar} alt="" />
          <input
            type="search"
            placeholder={isMobile ? 'Buscar por empresa' : 'Buscar por empresa ou responsável'}
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
          />
        </label>

        {isMobile && filtros}
      </div>

      {usuarios.length ? (
        <section className="usuarios" aria-label="Usuários">
          {usuarios.map((usuario) => (
            <CartaoUsuario key={usuario.id} usuario={usuario} />
          ))}
        </section>
      ) : (
        <p className="aviso" role="status">
          Nenhum cadastro encontrado para essa busca.
        </p>
      )}
    </OrganizadorLayout>
  )
}
