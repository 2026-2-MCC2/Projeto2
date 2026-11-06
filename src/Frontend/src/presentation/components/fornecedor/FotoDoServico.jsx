import { useCallback } from 'react'

// url null é foto salva cujo link não pôde ser gerado agora
export function FotoDoServico({ foto, indice, aoFalharFoto }) {
  const propriedades = {
    alt: `Foto ${indice + 1} do serviço`,
    className: 'proposta-detalhes__foto',
  }

  if (foto.arquivo) return <PreviaDoArquivo arquivo={foto.arquivo} {...propriedades} />
  if (foto.url) return <img src={foto.url} onError={aoFalharFoto} {...propriedades} />
  return (
    <span className="proposta-detalhes__foto proposta-detalhes__foto--sem-link">
      Foto indisponível agora
    </span>
  )
}

// criada e revogada no mesmo ref callback: fora dele o StrictMode revogaria a URL na primeira limpeza
function PreviaDoArquivo({ arquivo, ...propriedades }) {
  const mostrarArquivo = useCallback(
    (imagem) => {
      const url = URL.createObjectURL(arquivo)
      imagem.src = url
      return () => URL.revokeObjectURL(url)
    },
    [arquivo],
  )
  return <img ref={mostrarArquivo} {...propriedades} />
}
