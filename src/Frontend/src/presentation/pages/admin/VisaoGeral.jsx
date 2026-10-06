import { useState } from 'react'
import { OrganizadorLayout } from '../../components/organizador/OrganizadorLayout.jsx'
import { EVENTOS_ADMIN, INDICADORES_ADMIN } from '../../data/visaoGeral.js'
import { Icone } from '../../components/comum/Icone.jsx'
import iconeBuscar from '../../assets/organizador/icone-buscar.svg'
import '../../styles/admin.css'

const COLUNAS = [
  { chave: 'nome', rotulo: 'Evento' },
  { chave: 'organizador', rotulo: 'Organizador' },
  { chave: 'situacao', rotulo: 'Situação' },
  { chave: 'custos', rotulo: 'Custos' },
  { chave: 'propostas', rotulo: 'Propostas' },
  { chave: 'ticket', rotulo: 'Ticket estimado' },
]

function Indicadores() {
  return (
    <section className="visao-geral__indicadores" aria-label="Indicadores da plataforma">
      {INDICADORES_ADMIN.map((indicador) => (
        <article className="visao-geral__indicador" key={indicador.id}>
          <h2>{indicador.titulo}</h2>
          <p className="visao-geral__valor">{indicador.valor}</p>
          <p className="visao-geral__detalhe">{indicador.detalhe}</p>
        </article>
      ))}
    </section>
  )
}

function EtiquetaSituacao({ situacao }) {
  const variacao = situacao
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replaceAll(' ', '-')
  return (
    <span className={`visao-geral__etiqueta visao-geral__etiqueta--${variacao}`}>{situacao}</span>
  )
}

function TabelaEventos({ eventos }) {
  return (
    <div className="visao-geral__tabela-scroll">
      <table className="visao-geral__tabela">
        <thead>
          <tr>
            {COLUNAS.map((coluna) => (
              <th className={`visao-geral__celula--${coluna.chave}`} key={coluna.chave} scope="col">
                {coluna.rotulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {eventos.map((evento) => (
            <tr key={evento.id}>
              {COLUNAS.map((coluna) => (
                <td
                  className={`visao-geral__celula--${coluna.chave}`}
                  key={coluna.chave}
                  data-label={coluna.rotulo}
                >
                  {coluna.chave === 'situacao' ? (
                    <EtiquetaSituacao situacao={evento.situacao} />
                  ) : (
                    evento[coluna.chave]
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function VisaoGeral() {
  const [busca, setBusca] = useState('')
  const termo = busca.trim().toLocaleLowerCase('pt-BR')
  const eventos = EVENTOS_ADMIN.filter((evento) =>
    `${evento.nome} ${evento.organizador}`.toLocaleLowerCase('pt-BR').includes(termo),
  )

  return (
    <OrganizadorLayout
      perfil="admin"
      titulo="Visão geral"
      apoio="Situação da plataforma em setembro de 2026."
    >
      <Indicadores />

      <label className="visao-geral__busca">
        <Icone src={iconeBuscar} />
        <input
          type="search"
          placeholder="Buscar evento ou organizador"
          value={busca}
          onChange={(evento) => setBusca(evento.target.value)}
        />
      </label>

      {eventos.length ? (
        <section className="visao-geral__painel" aria-label="Eventos da plataforma">
          <TabelaEventos eventos={eventos} />
        </section>
      ) : (
        <p className="visao-geral__vazio" role="status">
          Nenhum evento encontrado para essa busca.
        </p>
      )}
    </OrganizadorLayout>
  )
}
