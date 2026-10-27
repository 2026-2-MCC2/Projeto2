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

// ao parar ou recomeçar, os trechos da leitura antiga são ignorados
let leituraAtual = 0

function ler() {
  const trechos = dividirEmTrechos(textoParaLer())
  if (!trechos.length) return

  const esta = ++leituraAtual
  const voz = vozEmPortugues()
  const jaFalando = sintese.speaking || sintese.pending
  mudarEstado(true)

  // Um trecho por vez
  function falar(indice) {
    if (esta !== leituraAtual) return
    if (indice === trechos.length) {
      mudarEstado(false)
      return
    }

    const fala = new SpeechSynthesisUtterance(trechos[indice])
    fala.lang = 'pt-BR'
    if (voz) fala.voice = voz
    fala.onend = () => falar(indice + 1)
    fala.onerror = (evento) => {
      if (evento.error === 'canceled' || evento.error === 'interrupted') return
      console.error('Leitura em voz alta falhou:', evento.error)
      if (esta === leituraAtual) mudarEstado(false)
    }
    sintese.resume() // o Chrome às vezes deixa a síntese travada em pausa
    sintese.speak(fala)
  }

  // O iOS só deixa falar dentro do toque no botão, então a primeira fala sai na hora. O atraso só
  // entra depois de um cancel(), porque falar logo em seguida faz o Chrome descartar a fala.
  if (jaFalando) {
    sintese.cancel()
    setTimeout(() => falar(0), 100)
  } else {
    falar(0)
  }
}

function parar() {
  leituraAtual++
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
