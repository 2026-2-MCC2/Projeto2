import { Icone } from '../comum/Icone.jsx'
import iconeMensagem from '../../assets/fornecedor/icone-mensagem.svg'

export function ObservacaoDoOrganizador({ texto }) {
  return (
    <p className="observacao-do-organizador">
      <Icone src={iconeMensagem} />
      <span>
        <span className="oculto-visualmente">Observação do organizador: </span>
        {texto}
      </span>
    </p>
  )
}
