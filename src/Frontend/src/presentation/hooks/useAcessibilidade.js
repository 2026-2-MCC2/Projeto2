import { useSyncExternalStore } from 'react'

// `tema: 'sistema'` segue o prefers-color-scheme; 'claro' e 'escuro' são escolhas do usuário.
const PADRAO = { fonte: 100, contraste: false, movimento: false, leitura: false, tema: 'sistema' }
const CHAVE = 'trocaticket-acessibilidade'
const CHAVE_ANTIGA_DO_TEMA = 'tema'
const DURACAO_DA_TROCA = 200
const COR_DO_NAVEGADOR = { claro: '#ffffff', escuro: '#161e2c' }

const sistemaEscuro = window.matchMedia('(prefers-color-scheme: dark)')
const avisos = new Set()

function ler() {
  try {
    const salvos = JSON.parse(localStorage.getItem(CHAVE) ?? '{}')
    const temaAntigo = localStorage.getItem(CHAVE_ANTIGA_DO_TEMA)
    if (!salvos.tema && temaAntigo) salvos.tema = temaAntigo
    return { ...PADRAO, ...salvos }
  } catch {
    return PADRAO
  }
}

let ajustes = ler()

function temaAplicado(tema = ajustes.tema) {
  if (tema === 'sistema') return sistemaEscuro.matches ? 'escuro' : 'claro'
  return tema
}

// Mesma lógica do script do index.html, que roda antes da primeira pintura.
function aplicarTema(comTransicao) {
  const raiz = document.documentElement
  const tema = temaAplicado()
  if (raiz.dataset.tema === tema) return

  if (comTransicao) {
    raiz.classList.add('trocando-tema')
    setTimeout(() => raiz.classList.remove('trocando-tema'), DURACAO_DA_TROCA)
  }
  raiz.dataset.tema = tema
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', COR_DO_NAVEGADOR[tema])
}

function aplicar() {
  const raiz = document.documentElement
  raiz.style.setProperty('--escala-texto', ajustes.fonte / 100)
  raiz.classList.toggle('alto-contraste', ajustes.contraste)
  raiz.classList.toggle('sem-movimento', ajustes.movimento)
  raiz.classList.toggle('leitura-facil', ajustes.leitura)
  aplicarTema(true)
}

function salvar(novos) {
  ajustes = novos
  aplicar()

  try {
    localStorage.setItem(CHAVE, JSON.stringify(ajustes))
    localStorage.removeItem(CHAVE_ANTIGA_DO_TEMA)
  } catch {
    // navegador sem armazenamento disponível
  }
  avisos.forEach((avisar) => avisar())
}

sistemaEscuro.addEventListener('change', () => {
  if (ajustes.tema !== 'sistema') return
  aplicarTema(true)
  // Novo objeto para o React perceber a mudança e trocar o ícone dos botões.
  ajustes = { ...ajustes }
  avisos.forEach((avisar) => avisar())
})

aplicar()

function inscrever(avisar) {
  avisos.add(avisar)
  return () => avisos.delete(avisar)
}

// Guarda as preferências num estado único, então o botão do cabeçalho, o flutuante e o painel ficam sincronizados.
export function useAcessibilidade() {
  const atuais = useSyncExternalStore(inscrever, () => ajustes)

  const alternar = (nome) => salvar({ ...ajustes, [nome]: !ajustes[nome] })
  const mudarFonte = (valor) => salvar({ ...ajustes, fonte: valor })
  const mudarTema = (tema) => salvar({ ...ajustes, tema })
  const restaurar = () => salvar(PADRAO)

  return {
    ajustes: atuais,
    tema: temaAplicado(atuais.tema),
    alternar,
    mudarFonte,
    mudarTema,
    restaurar,
  }
}
