import { useCallback } from 'react'

// Uma foto da proposta, igual na galeria da edição e no detalhe da proposta.
// foto: { url } de uma foto já enviada (url null é foto salva cujo link não pôde ser gerado agora)
// ou { arquivo } de uma foto escolhida que ainda vai com a proposta.
//   <FotoDoServico foto={{ url: foto.url }} indice={0} aoFalharFoto={aoFalharFoto} />
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

// A URL nasce e é revogada no mesmo ref callback: no StrictMode ele roda duas vezes, e uma URL criada
// fora dele seria revogada na primeira limpeza e ficaria quebrada.
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
