import { Link } from 'react-router-dom'
import { diasEntre, tempoRelativo } from '../../../domain/tempoRelativo.js'
import { Icone } from '../comum/Icone.jsx'
import { destinoDaNotificacao, tipoDaNotificacao } from './tiposDeNotificacao.js'

export function FiltrosDeNotificacoes({ filtro, aoMudar, naoLidas }) {
  const opcoes = [
    { valor: 'todas', nome: 'Todas' },
    { valor: 'nao-lidas', nome: naoLidas > 0 ? `Não lidas · ${naoLidas}` : 'Não lidas' },
  ]
  return (
    <div className="notificacoes__filtros" role="group" aria-label="Filtrar notificações">
      {opcoes.map((opcao) => (
        <button
          key={opcao.valor}
          type="button"
          className={`notificacoes__filtro${filtro === opcao.valor ? ' notificacoes__filtro--ativo' : ''}`}
          aria-pressed={filtro === opcao.valor}
          onClick={() => aoMudar(opcao.valor)}
        >
          {opcao.nome}
        </button>
      ))}
    </div>
  )
}

function ItemDaNotificacao({ notificacao, aoAbrir }) {
  const { icone, tom } = tipoDaNotificacao(notificacao.type)
  const conteudo = (
    <>
      <span className={`notificacao__icone notificacao__icone--${tom}`}>
        <Icone src={icone} />
      </span>
      <span className="notificacao__texto">
        <strong>{notificacao.title}</strong>
        <span className="notificacao__corpo">{notificacao.body}</span>
        <time dateTime={notificacao.created_at}>{tempoRelativo(notificacao.created_at)}</time>
      </span>
      {!notificacao.read && (
        <span className="notificacao__nao-lida">
          <span className="so-leitor">Não lida</span>
        </span>
      )}
    </>
  )
  const classe = `notificacao${notificacao.read ? '' : ' notificacao--nao-lida'}`

  return (
    <li>
      {notificacao.link ? (
        <Link
          to={destinoDaNotificacao(notificacao)}
          className={classe}
          viewTransition
          onClick={() => aoAbrir(notificacao)}
        >
          {conteudo}
        </Link>
      ) : (
        <button type="button" className={classe} onClick={() => aoAbrir(notificacao)}>
          {conteudo}
        </button>
      )}
    </li>
  )
}

// agrupado só na página: "Hoje" e "Anteriores", como no Figma do celular
export function ListaDeNotificacoes({ itens, aoAbrir, agrupar = false }) {
  if (!agrupar) {
    return (
      <ul className="notificacoes__lista">
        {itens.map((notificacao) => (
          <ItemDaNotificacao
            key={notificacao.notification_key}
            notificacao={notificacao}
            aoAbrir={aoAbrir}
          />
        ))}
      </ul>
    )
  }

  const grupos = [
    { nome: 'Hoje', itens: itens.filter((item) => diasEntre(new Date(item.created_at)) <= 0) },
    { nome: 'Anteriores', itens: itens.filter((item) => diasEntre(new Date(item.created_at)) > 0) },
  ].filter((grupo) => grupo.itens.length > 0)

  return grupos.map((grupo) => (
    <section key={grupo.nome} className="notificacoes__grupo" aria-label={grupo.nome}>
      <h2 className="notificacoes__grupo-titulo">{grupo.nome}</h2>
      <ListaDeNotificacoes itens={grupo.itens} aoAbrir={aoAbrir} />
    </section>
  ))
}
