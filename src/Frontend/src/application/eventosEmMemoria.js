// eventos já buscados na API, por event_key; as telas abertas acompanham quando algum muda
const eventosPorChave = new Map()
const ouvintes = new Set()

export function guardarEventos(eventos) {
  eventos.forEach((evento) => eventosPorChave.set(evento.id, evento))
  ouvintes.forEach((ouvinte) => ouvinte())
}

export function buscarEventoEmMemoria(eventKey) {
  return eventosPorChave.get(eventKey)
}

export function observarEventos(ouvinte) {
  ouvintes.add(ouvinte)
  return () => ouvintes.delete(ouvinte)
}
