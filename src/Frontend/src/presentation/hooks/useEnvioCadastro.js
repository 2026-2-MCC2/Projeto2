import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { enviarCadastro } from '../../infrastructure/cadastro.js'

// Envio do autocadastro, usado pela tela desktop (Cadastro.jsx) e pela mobile (CadastroMobile.jsx).
//   const { enviar, enviando, erro } = useEnvioCadastro()
//   enviar({ perfil, nome, cnpj, telefone, email, senha, areaDeAtuacao })
// Em sucesso, vai para /cadastro-pendente levando { perfil, nome, cnpj, areaDeAtuacao } no state.

export function useEnvioCadastro() {
  const navegar = useNavigate()
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  async function enviar(dados) {
    setErro('')
    setEnviando(true)

    // a área de atuação é só do fornecedor: no organizador ela nem é enviada
    const areaDeAtuacao = dados.perfil === 'fornecedor' ? dados.areaDeAtuacao : undefined

    try {
      await enviarCadastro({ ...dados, areaDeAtuacao })
      navegar('/cadastro-pendente', {
        state: { perfil: dados.perfil, nome: dados.nome, cnpj: dados.cnpj, areaDeAtuacao },
      })
    } catch (falha) {
      // a mensagem já vem em português, inclusive quando o backend está fora do ar (ver infrastructure/api.js)
      setErro(falha.message)
      setEnviando(false)
    }
  }

  return { enviar, enviando, erro }
}
