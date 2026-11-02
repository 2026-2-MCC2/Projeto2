import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { enviarCadastro } from '../../infrastructure/cadastro.js'

export function useEnvioCadastro() {
  const navegar = useNavigate()
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  async function enviar(dados) {
    setErro('')
    setEnviando(true)

    // o backend recusa categorias para organizador
    const categorias = dados.perfil === 'fornecedor' ? dados.categorias : undefined

    try {
      await enviarCadastro({ ...dados, categorias })
      navegar('/cadastro-pendente', {
        state: { perfil: dados.perfil, nome: dados.nome, cnpj: dados.cnpj, categorias },
      })
    } catch (falha) {
      setErro(falha.message)
      setEnviando(false)
    }
  }

  return { enviar, enviando, erro }
}
