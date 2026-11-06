// "menos movimento" vem do sistema (prefers-reduced-motion) ou do painel de acessibilidade do site,
// que põe .sem-movimento na raiz (useAcessibilidade)
export const semMovimento = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
  document.documentElement.classList.contains('sem-movimento')

// pulse rápido (scale 1 → escala → 1), só em transform. Uma chamada nova substitui a anterior
export function pulsar(elemento, { escala = 1.06, duracao = 250 } = {}) {
  if (!elemento || semMovimento()) return
  elemento.animate(
    [{ transform: 'scale(1)' }, { transform: `scale(${escala})` }, { transform: 'scale(1)' }],
    { duration: duracao, easing: 'ease-out' },
  )
}
