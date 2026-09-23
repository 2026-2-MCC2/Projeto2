// Peças de formulário da área do organizador.

export function Campo({ rotulo, ajuda, children, ...props }) {
  return (
    <label className="campo">
      <span>{rotulo}</span>
      {children ?? <input type="text" {...props} />}
      {ajuda && <small>{ajuda}</small>}
    </label>
  )
}

export function CampoFixo({ rotulo, valor, ajuda, icone }) {
  return (
    <div className="campo">
      <span>{rotulo}</span>
      <p className="campo__bloqueado">
        {valor}
        {icone && <img src={icone} alt="" />}
      </p>
      {ajuda && <small>{ajuda}</small>}
    </div>
  )
}

export function Linha({ children }) {
  return <div className="painel__linha">{children}</div>
}

export function SeDesktop({ isMobile, envolver: Envolver, children }) {
  if (isMobile) return children
  return <Envolver>{children}</Envolver>
}

export function Grupo({ isMobile, titulo, children }) {
  return (
    <div className={isMobile ? 'campo-grupo' : 'secao'}>
      {!isMobile && <h2 className="secao__titulo">{titulo}</h2>}
      {children}
    </div>
  )
}

export function Painel({ titulo, apoio, children, ...props }) {
  const Elemento = props.onSubmit ? 'form' : 'section'

  return (
    <Elemento className="painel" {...props}>
      <div className="painel__titulo">
        <h2>{titulo}</h2>
        {apoio && <p>{apoio}</p>}
      </div>
      {children}
    </Elemento>
  )
}

export function Acoes({ children }) {
  return <div className="painel__acoes">{children}</div>
}

export function Botao({ secundario = false, children, ...props }) {
  return (
    <button className={`botao${secundario ? ' botao--secundario' : ''}`} {...props}>
      {children}
    </button>
  )
}
