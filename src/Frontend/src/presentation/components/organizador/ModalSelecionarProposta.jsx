import { formatarMoeda } from '../../../application/eventos.js'
import { Modal } from '../comum/Modal.jsx'
import iconeAceitar from '../../assets/organizador/icone-modal-aceitar.svg'

// Confirmação de escolha de uma proposta, usada na aba Propostas e na proposta recebida.
export function ModalSelecionarProposta({ proposta, item, salvando, aoConfirmar, aoFechar }) {
  return (
    <Modal
      icone={iconeAceitar}
      corDoIcone="verde"
      titulo="Selecionar esta proposta?"
      mensagem="O valor entra nos itens de custo do evento e o ticket é recalculado. As demais propostas deste item ficam recusadas."
      dados={[
        { rotulo: 'Fornecedor', valor: proposta.supplier_name },
        { rotulo: 'Item', valor: item.description },
        { rotulo: 'Valor', valor: formatarMoeda(proposta.amount) },
      ]}
      acao={{
        cancelar: 'Voltar',
        confirmar: salvando ? 'Selecionando...' : 'Selecionar proposta',
        ocupado: salvando,
        aoConfirmar,
      }}
      aoFechar={() => !salvando && aoFechar()}
    />
  )
}
