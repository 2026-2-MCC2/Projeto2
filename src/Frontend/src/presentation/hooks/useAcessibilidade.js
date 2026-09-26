import { useEffect, useState } from 'react'

const PADRAO = { fonte: 100, contraste: false, movimento: false, leitura: false }
const CHAVE = 'trocaticket-acessibilidade'

function ler() {
  try {
    return { ...PADRAO, ...JSON.parse(localStorage.getItem(CHAVE) ?? '{}') }
  } catch {
    return PADRAO
  }
}

// Guarda as preferências e aplica no elemento raiz, valendo para todas as telas.
export function useAcessibilidade() {
  const [ajustes, setAjustes] = useState(ler)

  useEffect(() => {
    const raiz = document.documentElement
    raiz.style.setProperty('--escala-texto', ajustes.fonte / 100)
    raiz.classList.toggle('alto-contraste', ajustes.contraste)
    raiz.classList.toggle('sem-movimento', ajustes.movimento)
    raiz.classList.toggle('leitura-facil', ajustes.leitura)

    try {
      localStorage.setItem(CHAVE, JSON.stringify(ajustes))
    } catch {
      // navegador sem armazenamento disponível
    }
  }, [ajustes])

  const alternar = (nome) => setAjustes((atual) => ({ ...atual, [nome]: !atual[nome] }))
  const mudarFonte = (valor) => setAjustes((atual) => ({ ...atual, fonte: valor }))
  const restaurar = () => setAjustes(PADRAO)

  return { ajustes, alternar, mudarFonte, restaurar }
}
