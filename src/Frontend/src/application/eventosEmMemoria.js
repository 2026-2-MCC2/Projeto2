// cada pedido é numerado na saída: uma resposta antiga nunca sobrescreve a de um pedido mais novo
const eventosPorChave = new Map()
const pedidoPorChave = new Map()
const ouvintes = new Set()
let ultimoPedido = 0
let pedidoDaUltimaLimpeza = 0

export function iniciarPedido() {
  ultimoPedido += 1
  return ultimoPedido
}

export function guardarEventos(eventos, pedido) {
  if (pedido < pedidoDaUltimaLimpeza) return

  const maisNovos = eventos.filter((evento) => (pedidoPorChave.get(evento.id) ?? 0) <= pedido)
  maisNovos.forEach((evento) => {
    eventosPorChave.set(evento.id, evento)
    pedidoPorChave.set(evento.id, pedido)
  })
  if (maisNovos.length > 0) ouvintes.forEach((ouvinte) => ouvinte())
}

export function limparEventosEmMemoria() {
  pedidoDaUltimaLimpeza = iniciarPedido()
  eventosPorChave.clear()
  pedidoPorChave.clear()
  ouvintes.forEach((ouvinte) => ouvinte())
}

export function buscarEventoEmMemoria(eventKey) {
  return eventosPorChave.get(eventKey)
}

export function observarEventos(ouvinte) {
  ouvintes.add(ouvinte)
  return () => ouvintes.delete(ouvinte)
}
