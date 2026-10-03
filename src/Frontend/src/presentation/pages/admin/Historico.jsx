import { useState } from 'react'
import { OrganizadorLayout } from '../../components/organizador/OrganizadorLayout.jsx'
import { useIsMobile } from '../../hooks/useIsMobile.js'
import { HISTORICO } from '../../data/historico.js'
import '../../styles/admin.css'

const FILTROS = ['Todos', 'Aprovado', 'Rejeitado', 'Bloqueado']

function EtiquetaAcao({ acao }) {
  return (
    <span className={`historico__etiqueta historico__etiqueta--${acao.toLowerCase()}`}>
      {acao}
    </span>
  )
}

function Filtros({ selecionado, aoSelecionar }) {
  return (
    <div className="historico__filtros" aria-label="Filtrar histórico por ação">
      {FILTROS.map((filtro) => (
        <button
          key={filtro}
          type="button"
          className={`historico__filtro${
            selecionado === filtro ? ' historico__filtro--ativo' : ''
          }`}
          aria-pressed={selecionado === filtro}
          onClick={() => aoSelecionar(filtro)}
        >
          {filtro}
        </button>
      ))}
    </div>
  )
}

export function Historico() {
  const isMobile = useIsMobile()
  const [filtro, setFiltro] = useState('Todos')
  const registros = HISTORICO.filter((registro) => filtro === 'Todos' || registro.acao === filtro)
  const filtros = <Filtros selecionado={filtro} aoSelecionar={setFiltro} />

  return (
    <OrganizadorLayout
      perfil="admin"
      titulo={isMobile ? 'Histórico' : 'Histórico de alterações'}
      apoio="Registro das aprovações, rejeições e bloqueios realizados."
      acoes={isMobile ? undefined : filtros}
    >
      {isMobile && filtros}

      <section className="historico" aria-label="Histórico de alterações">
        <div className="historico__cabecalho" aria-hidden="true">
          <span>Data</span>
          <span>Ação</span>
          <span>Empresa</span>
          <span>Perfil</span>
          <span>Responsável</span>
        </div>

        {registros.map((registro) => (
          <article className="historico__linha" key={registro.id}>
            <time className="historico__data">{registro.data}</time>
            <div className="historico__acao">
              <span className="historico__rotulo">Ação</span>
              <EtiquetaAcao acao={registro.acao} />
            </div>
            <p className="historico__empresa">{registro.empresa}</p>
            <p className="historico__perfil">
              <span className="historico__rotulo">Perfil</span>
              {registro.perfil}
            </p>
            <p className="historico__responsavel">
              <span className="historico__rotulo">Responsável</span>
              {registro.responsavel}
            </p>
          </article>
        ))}

        {registros.length === 0 && (
          <p className="historico__vazio" role="status">
            Nenhum registro encontrado para esse filtro.
          </p>
        )}
      </section>
    </OrganizadorLayout>
  )
}
