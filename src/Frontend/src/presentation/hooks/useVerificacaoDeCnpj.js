import { useState } from 'react'
import { verificarCnpj } from '../../infrastructure/cadastro.js'

const CNPJ_JA_CADASTRADO =
  'Já existe um cadastro com este CNPJ. Se a empresa é sua, entre com o e-mail usado nele.'

// avisa na etapa do CNPJ, antes de a pessoa preencher e-mail e senha
export function useVerificacaoDeCnpj() {
  const [verificando, setVerificando] = useState(false)
  const [erroDoCnpj, setErroDoCnpj] = useState('')

  async function cnpjEstaLivre(cnpj) {
    setErroDoCnpj('')
    setVerificando(true)
    try {
      const { available } = await verificarCnpj(cnpj)
      if (!available) setErroDoCnpj(CNPJ_JA_CADASTRADO)
      return available
    } catch (falha) {
      setErroDoCnpj(falha.message)
      return false
    } finally {
      setVerificando(false)
    }
  }

  return { verificando, erroDoCnpj, cnpjEstaLivre, limparErroDoCnpj: () => setErroDoCnpj('') }
}
