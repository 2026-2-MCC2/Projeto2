import { Modal } from '../comum/Modal.jsx'
import { useNovoItemDeCusto } from '../../hooks/useNovoItemDeCusto.js'
import { CamposDoItem } from './CamposDoItem.jsx'

export function ModalNovoItem({ eventKey, evento, aoFechar, aoSalvar }) {
  const concluir = () => {
    aoFechar()
    aoSalvar?.()
  }
  const { dados, definir, enviando, salvar } = useNovoItemDeCusto(eventKey, concluir)

  return (
    <Modal
      titulo="Novo item de custo"
      subtitulo={evento}
      largo
      acao={{
        cancelar: 'Cancelar',
        confirmar: enviando ? 'Salvando...' : 'Adicionar item',
        aoConfirmar: salvar,
        ocupado: enviando,
      }}
      aoFechar={() => !enviando && aoFechar()}
    >
      <CamposDoItem dados={dados} definir={definir} />
    </Modal>
  )
}
