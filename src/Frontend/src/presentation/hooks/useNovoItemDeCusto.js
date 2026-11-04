import { useState } from 'react'
import { criarItemDeCotacao, incluirCustoProprio } from '../../application/eventos.js'
import { paraNumero } from '../../domain/validacao.js'
import { toast } from '../toasts.js'

export const TIPOS_DE_CUSTO = [
  { valor: 'tax', nome: 'Fiscal' },
  { valor: 'operational', nome: 'Operacional' },
  { valor: 'other', nome: 'Outros' },
]

const ITEM_EM_BRANCO = {
  descricao: '',
  categoria: '',
  tipoDeCusto: 'tax',
  valor: '',
  origem: 'cotacao',
  tipoItem: 'service',
  quantidade: '1',
  observacoes: '',
}

export function useNovoItemDeCusto(eventKey, aoConcluir) {
  const [dados, setDados] = useState(ITEM_EM_BRANCO)
  const [enviando, setEnviando] = useState(false)

  const definir = (nome, valor) => setDados((atual) => ({ ...atual, [nome]: valor }))

  async function salvar() {
    const erroDeValidacao = validarDadosDoItem(dados)
    if (erroDeValidacao) {
      toast.erro('Confira os dados do item', { descricao: erroDeValidacao })
      return
    }

    setEnviando(true)
    try {
      if (dados.origem === 'proprio') {
        await incluirCustoProprio(eventKey, {
          descricao: dados.descricao,
          tipo: dados.tipoDeCusto,
          valor: dados.valor,
        })
        toast.sucesso('Custo incluído', { descricao: dados.descricao.trim() })
      } else {
        await criarItemDeCotacao(eventKey, {
          categoria: dados.categoria,
          descricao: dados.descricao,
          tipoItem: dados.tipoItem,
          quantidade: dados.quantidade,
          valorEstimado: dados.valor,
          observacoes: dados.observacoes,
        })
        toast.sucesso('Item adicionado para cotação', { descricao: dados.descricao.trim() })
      }
      aoConcluir()
    } catch (falha) {
      toast.erro('Não foi possível salvar o item', { descricao: falha.message })
      setEnviando(false)
    }
  }

  return { dados, definir, enviando, salvar }
}

function validarDadosDoItem(dados) {
  if (!dados.descricao.trim()) return 'Informe a descrição.'
  if (dados.origem === 'proprio') {
    return dados.tipoDeCusto && paraNumero(dados.valor) > 0
      ? ''
      : 'Informe o tipo e um valor maior que zero para o custo próprio.'
  }

  if (!dados.categoria) return 'Selecione uma categoria.'
  if (!['product', 'service'].includes(dados.tipoItem)) return 'Selecione produto ou serviço.'
  if (!Number.isInteger(Number(dados.quantidade)) || Number(dados.quantidade) < 1) {
    return 'Informe uma quantidade inteira maior que zero.'
  }
  if (dados.valor && (!Number.isFinite(paraNumero(dados.valor)) || paraNumero(dados.valor) < 0)) {
    return 'O valor previsto precisa ser um valor igual ou maior que zero.'
  }
  return ''
}
