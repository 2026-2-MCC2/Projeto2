import logotipo from '../../assets/acesso/logotipo-trocaticket.png'
import simbolo from '../../assets/organizador/simbolo.png'

// No claro usa o PNG oficial; no escuro, a versão negativa do Figma (nó 518:8):
// símbolo transparente com "Troca" em texto/primario e "Ticket" em laranja.
// A negativa é provisória até existir o vetor oficial.
export function Logotipo({ className = '' }) {
  return (
    <span
      className={`logotipo${className ? ` ${className}` : ''}`}
      role="img"
      aria-label="TrocaTicket"
    >
      <img src={logotipo} alt="" className="logotipo__claro" />
      <span className="logotipo__negativo" aria-hidden="true">
        <img src={simbolo} alt="" />
        <span className="logotipo__nome">
          Troca<span>Ticket</span>
        </span>
      </span>
    </span>
  )
}
