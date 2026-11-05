import logotipo from '../../assets/landing/logotipo-trocaticket.png'
import logotipoNegativo from '../../assets/acesso/logotipo-trocaticket-negativo.png'

// logotipo exportado do Figma (navbar e rodapé). Usa as mesmas classes do Logotipo comum:
// no tema escuro entra a versão negativa. A altura vem de --logo-altura na className.
export function LogotipoLanding({ className = '' }) {
  return (
    <span
      className={`logotipo logotipo-landing${className ? ` ${className}` : ''}`}
      role="img"
      aria-label="TrocaTicket"
    >
      <img src={logotipo} alt="" className="logotipo__claro" />
      <img src={logotipoNegativo} alt="" className="logotipo__negativo" />
    </span>
  )
}
