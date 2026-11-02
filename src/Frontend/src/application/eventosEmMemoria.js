// eventos já buscados na API, por event_key; as telas abertas acompanham quando algum muda.
// Cada pedido à API recebe um número na ordem em que sai: uma resposta só substitui o que veio
// de um pedido mais novo se ela for de um pedido ainda mais novo, e nada de antes de sair da
// conta volta para a memória.
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
