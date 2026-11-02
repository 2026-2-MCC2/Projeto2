const MAXIMO_VISIVEL = 3
const DURACAO_EM_MS = { sucesso: 5000, info: 5000, erro: 8000 }

export function criarFilaDeToasts() {
  let toasts = []
  let proximoId = 1
  const ouvintes = new Set()
  const avisarOuvintes = () => ouvintes.forEach((ouvinte) => ouvinte())

  function mostrar(tom, titulo, { descricao, acao } = {}) {
    const igual = toasts.find(
      (toast) => toast.tom === tom && toast.titulo === titulo && toast.descricao === descricao,
    )
    if (igual) return igual.id

    const toast = { id: proximoId++, tom, titulo, descricao, acao, duracao: DURACAO_EM_MS[tom] }
    toasts = [...toasts, toast].slice(-MAXIMO_VISIVEL)
    avisarOuvintes()
    return toast.id
  }

  return {
    sucesso: (titulo, opcoes) => mostrar('sucesso', titulo, opcoes),
    erro: (titulo, opcoes) => mostrar('erro', titulo, opcoes),
    info: (titulo, opcoes) => mostrar('info', titulo, opcoes),
    fechar(id) {
      toasts = toasts.filter((toast) => toast.id !== id)
      avisarOuvintes()
    },
    atuais: () => toasts,
    inscrever(ouvinte) {
      ouvintes.add(ouvinte)
      return () => ouvintes.delete(ouvinte)
    },
  }
}

// uma fila para o app todo: qualquer tela avisa sem precisar de contexto do React
export const toast = criarFilaDeToasts()
