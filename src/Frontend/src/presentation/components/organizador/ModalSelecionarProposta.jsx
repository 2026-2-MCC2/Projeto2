import { formatarMoeda } from '../../../domain/formatacao.js'
import { Modal } from '../comum/Modal.jsx'
import iconeAceitar from '../../assets/organizador/icone-modal-aceitar.svg'

// troca: o item já tinha uma proposta escolhida, que passa a ficar recusada
export function ModalSelecionarProposta({
  proposta,
  item,
  troca,
  salvando,
  aoConfirmar,
  aoFechar,
}) {
  return (
    <Modal
      icone={iconeAceitar}
      corDoIcone="verde"
      titulo={troca ? 'Trocar a proposta escolhida?' : 'Selecionar esta proposta?'}
      mensagem={
        troca
          ? 'Esta proposta passa a ser a escolhida do item e a anterior fica recusada. O custo e o ticket são recalculados.'
          : 'O valor entra nos itens de custo do evento e o ticket é recalculado. As demais propostas deste item ficam recusadas.'
      }
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
