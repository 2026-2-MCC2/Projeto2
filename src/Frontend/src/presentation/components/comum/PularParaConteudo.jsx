export function PularParaConteudo() {
  function pular(evento) {
    evento.preventDefault()
    document.getElementById('conteudo')?.focus()
  }

  return (
    <a href="#conteudo" className="pular-conteudo" onClick={pular}>
      Pular para o conteúdo
    </a>
  )
}
