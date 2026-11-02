import logotipo from '../../assets/acesso/logotipo-trocaticket.png'
import logotipoNegativo from '../../assets/acesso/logotipo-trocaticket-negativo.png'

// as duas imagens têm o mesmo tamanho; no escuro só o "Troca" fica claro
export function Logotipo({ className = '' }) {
  return (
    <span
      className={`logotipo${className ? ` ${className}` : ''}`}
      role="img"
      aria-label="TrocaTicket"
    >
      <img src={logotipo} alt="" className="logotipo__claro" />
      <img src={logotipoNegativo} alt="" className="logotipo__negativo" />
    </span>
  )
}
