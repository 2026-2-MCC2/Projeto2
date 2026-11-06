export function AbasDeFiltro({ rotulo, abas, ativa, aoMudar }) {
  return (
    <div className="abas-de-filtro" role="group" aria-label={rotulo}>
      {abas.map((aba) => (
        <button
          key={aba.chave}
          type="button"
          className={`abas-de-filtro__aba${aba.chave === ativa ? ' abas-de-filtro__aba--ativa' : ''}`}
          aria-pressed={aba.chave === ativa}
          onClick={() => aoMudar(aba.chave)}
        >
          {aba.rotulo}
          <span className="abas-de-filtro__contagem">{aba.quantidade}</span>
        </button>
      ))}
    </div>
  )
}
