import iconeClaro from '../../assets/comum/icone-acessibilidade-claro.svg'
import iconeEscuro from '../../assets/comum/icone-acessibilidade.svg'
import '../../styles/acessibilidade.css'

// Usado pelo organizador, pelo fornecedor e pelo administrador.

export function BotaoAcessibilidade({ posicao = 'flutuante' }) {
  const flutuante = posicao === 'flutuante'

  return (
    <button type="button" className={`acessibilidade acessibilidade--${posicao}`} aria-label="Opções de acessibilidade">
      <img src={flutuante ? iconeClaro : iconeEscuro} alt="" />
    </button>
  )
}
