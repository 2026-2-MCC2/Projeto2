// Modal para editar ou remover um item de custo aberto para cotação.
import { useState } from 'react'
import { atualizarItemDeCotacao, excluirItemDeCotacao } from '../../../application/eventos.js'
import { Modal } from '../comum/Modal.jsx'
import { toast } from '../../toasts.js'
import { Botao } from './Formulario.jsx'
import { CamposDoItem } from './CamposDoItem.jsx'

export function ModalItemDeCotacao({ eventKey, evento, item, aoFechar, aoSalvar }) {
  const [dados, setDados] = useState({
    descricao: item.description,
    categoria: item.category,
    tipoItem: item.type,
    quantidade: String(item.quantity),
    valor: item.estimated_value == null ? '' : String(item.estimated_value),
    observacoes: item.notes ?? '',
    origem: 'cotacao',
  })
  const [enviando, setEnviando] = useState(false)
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)

  function definir(nome, valor) {
    setDados((atuais) => ({ ...atuais, [nome]: valor }))
  }

  async function salvar() {
    setEnviando(true)
    try {
      await atualizarItemDeCotacao(eventKey, item.item_key, {
        categoria: dados.categoria,
        descricao: dados.descricao,
        tipoItem: dados.tipoItem,
        quantidade: dados.quantidade,
        valorEstimado: dados.valor,
        observacoes: dados.observacoes,
      })
      toast.sucesso('Item atualizado', { descricao: dados.descricao.trim() })
      aoSalvar()
    } catch (falha) {
      toast.erro('Não foi possível atualizar o item', { descricao: falha.message })
      setEnviando(false)
    }
  }

  async function excluir() {
    setEnviando(true)
    try {
      await excluirItemDeCotacao(eventKey, item.item_key)
      toast.sucesso('Item removido', { descricao: item.description })
      aoSalvar()
    } catch (falha) {
      toast.erro('Não foi possível remover o item', { descricao: falha.message })
      setEnviando(false)
      setConfirmandoExclusao(false)
    }
  }

  return (
    <Modal
      titulo="Editar item de cotação"
      subtitulo={evento}
      largo
      acao={{
        cancelar: 'Cancelar',
        confirmar: enviando ? 'Salvando...' : 'Salvar item',
        aoConfirmar: salvar,
        ocupado: enviando,
      }}
      aoFechar={() => !enviando && aoFechar()}
    >
      <CamposDoItem dados={dados} definir={definir} mostrarOrigem={false} />
      <Botao
        type="button"
        perigo
        disabled={enviando}
        onClick={() => (confirmandoExclusao ? excluir() : setConfirmandoExclusao(true))}
      >
        {confirmandoExclusao ? 'Clique de novo para remover' : 'Remover este item'}
      </Botao>
    </Modal>
  )
}
