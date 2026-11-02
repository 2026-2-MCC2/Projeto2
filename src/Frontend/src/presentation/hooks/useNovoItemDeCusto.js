import { useState } from 'react'
import { incluirCustoProprio } from '../../application/eventos.js'
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
  observacoes: '',
}

// o custo próprio é salvo na API; o item para cotação ainda não tem rota (issue #7)
export function useNovoItemDeCusto(eventKey, aoConcluir) {
  const [dados, setDados] = useState(ITEM_EM_BRANCO)
  const [enviando, setEnviando] = useState(false)

  const definir = (nome, valor) => setDados((atual) => ({ ...atual, [nome]: valor }))

  async function salvar() {
    if (dados.origem !== 'proprio') {
      aoConcluir()
      return
    }

    setEnviando(true)
    try {
      await incluirCustoProprio(eventKey, {
        descricao: dados.descricao,
        tipo: dados.tipoDeCusto,
        valor: dados.valor,
      })
      toast.sucesso('Custo incluído', { descricao: dados.descricao.trim() })
      aoConcluir()
    } catch (falha) {
      toast.erro('Não foi possível salvar o custo', { descricao: falha.message })
      setEnviando(false)
    }
  }

  return { dados, definir, enviando, salvar }
}
