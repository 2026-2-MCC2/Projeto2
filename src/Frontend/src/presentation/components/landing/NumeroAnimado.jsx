import { useContagemAnimada } from '../../hooks/useContagemAnimada.js'

// Só o texto do número re-renderiza a cada quadro da animação, não a seção inteira.
// `formato` recebe o número da tela (com casas decimais no meio da animação) e devolve o texto.
export function NumeroAnimado({ valor, formato, duracao }) {
  const naTela = useContagemAnimada(valor, { duracao })
  return formato(naTela)
}
