// o número fica escondido do leitor de tela, que ouve a frase completa
// maximo: acima dele mostra "9+" ou "99+", para a bolinha não crescer
export function ContadorDeNaoLidas({ total, maximo = 99, className = '' }) {
  if (total <= 0) return null
  return (
    <span className={`contador-nao-lidas${className ? ` ${className}` : ''}`}>
      <span aria-hidden="true">{total > maximo ? `${maximo}+` : total}</span>
      <span className="so-leitor">{total === 1 ? ', 1 não lida' : `, ${total} não lidas`}</span>
    </span>
  )
}
