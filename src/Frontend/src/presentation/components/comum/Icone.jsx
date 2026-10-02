// Os SVGs são colocados direto na página (e não via <img>) para as cores seguirem os tokens do tema.
// O mapa liga a URL importada de cada arquivo ao conteúdo dele, então as telas continuam importando a URL.
const URLS = import.meta.glob('../../assets/**/*.svg', {
  query: '?url',
  import: 'default',
  eager: true,
})
const CONTEUDOS = import.meta.glob('../../assets/**/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
})

const SVG_POR_URL = Object.fromEntries(
  Object.entries(URLS).map(([caminho, url]) => [url, preparar(CONTEUDOS[caminho])]),
)

// Tira os ids exportados do Figma (repetem entre ícones) e passa o tamanho original para o CSS.
function preparar(svg) {
  const largura = svg.match(/<svg[^>]*\swidth="([\d.]+)"/)?.[1]
  const altura = svg.match(/<svg[^>]*\sheight="([\d.]+)"/)?.[1]
  const html = svg.replace(/\sid="[^"]*"/g, '')

  return { html, estilo: { '--icone-largura': `${largura}px`, '--icone-altura': `${altura}px` } }
}

export function Icone({ src, className = '' }) {
  const svg = SVG_POR_URL[src]
  if (!svg) return null

  return (
    <span
      className={`icone${className ? ` ${className}` : ''}`}
      style={svg.estilo}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: svg.html }}
    />
  )
}
