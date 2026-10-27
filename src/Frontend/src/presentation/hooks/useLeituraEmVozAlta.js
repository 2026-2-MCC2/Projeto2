import { useSyncExternalStore } from 'react'

const sintese = window.speechSynthesis
export const leituraDisponivel = Boolean(sintese) && 'SpeechSynthesisUtterance' in window

let lendo = false
const avisos = new Set()

function mudarEstado(novo) {
  lendo = novo
  avisos.forEach((avisar) => avisar())
}

function vozEmPortugues() {
  const vozes = sintese.getVoices()
  return vozes.find((voz) => voz.lang === 'pt-BR') ?? vozes.find((voz) => voz.lang.startsWith('pt'))
}

// o Chrome corta falas longas: lê em trechos de até ~200 caracteres, sem partir frases
function dividirEmTrechos(texto) {
  const frases = texto.replace(/\s+/g, ' ').match(/[^.!?;:]+[.!?;:]*/g) ?? []
  const trechos = []

  for (const frase of frases.map((item) => item.trim()).filter(Boolean)) {
    const ultimo = trechos[trechos.length - 1]
    if (ultimo && ultimo.length + frase.length < 200)
      trechos[trechos.length - 1] = `${ultimo} ${frase}`
    else trechos.push(frase)
  }
  return trechos
}

function textoParaLer() {
  const selecao = window.getSelection()?.toString().trim()
  if (selecao) return selecao
  return document.getElementById('conteudo')?.innerText ?? document.body.innerText
}

function ler() {
  sintese.cancel()
  const trechos = dividirEmTrechos(textoParaLer())
  if (!trechos.length) return

  const voz = vozEmPortugues()
  trechos.forEach((trecho, indice) => {
    const fala = new SpeechSynthesisUtterance(trecho)
    fala.lang = 'pt-BR'
    if (voz) fala.voice = voz
    if (indice === trechos.length - 1) fala.onend = () => mudarEstado(false)
    sintese.speak(fala)
  })
  mudarEstado(true)
}

function parar() {
  sintese.cancel()
  mudarEstado(false)
}

function inscrever(avisar) {
  avisos.add(avisar)
  return () => avisos.delete(avisar)
}

export function useLeituraEmVozAlta() {
  const estaLendo = useSyncExternalStore(inscrever, () => lendo)
  return { lendo: estaLendo, ler, parar }
}
