// "Cabeçalho da seção" do Figma: sobretítulo laranja, título e subtítulo opcional.
// O id vai no título para a <section> usar em aria-labelledby.
export function CabecalhoDaSecao({ id, sobretitulo, titulo, subtitulo, alinhamento = 'centro' }) {
  return (
    <header className={`cabecalho-secao cabecalho-secao--${alinhamento}`}>
      <p className="cabecalho-secao__sobretitulo">{sobretitulo}</p>
      <h2 id={id} className="cabecalho-secao__titulo">
        {titulo}
      </h2>
      {subtitulo && <p className="cabecalho-secao__subtitulo">{subtitulo}</p>}
    </header>
  )
}
