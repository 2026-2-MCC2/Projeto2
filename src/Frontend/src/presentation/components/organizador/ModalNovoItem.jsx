import { Modal } from '../comum/Modal.jsx'
import { CamposDoItem } from './CamposDoItem.jsx'

export function ModalNovoItem({ evento, aoFechar }) {
  return (
    <Modal
      titulo="Novo item de custo"
      subtitulo={evento}
      largo
      acao={{ cancelar: 'Cancelar', confirmar: 'Adicionar item' }}
      aoFechar={aoFechar}
    >
      <CamposDoItem />
    </Modal>
  )
}
