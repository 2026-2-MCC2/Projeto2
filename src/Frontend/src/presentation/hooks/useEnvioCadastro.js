import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { enviarCadastro } from '../../infrastructure/cadastro.js'

// Envio do autocadastro, usado pela tela desktop (Cadastro.jsx) e pela mobile (CadastroMobile.jsx).
//   const { enviar, enviando, erro, aviso } = useEnvioCadastro()
//   enviar({ perfil, nome, cnpj, telefone, email, senha })
// Em sucesso, vai para /cadastro-pendente levando { perfil, nome, cnpj } no state.

// O backend ainda só aceita o cadastro de organizador.
const PERFIS_COM_CADASTRO = ['organizador']

export function useEnvioCadastro() {
  const navegar = useNavigate()
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')

  async function enviar(dados) {
    setErro('')
    setAviso('')

    if (!PERFIS_COM_CADASTRO.includes(dados.perfil)) {
      setAviso('O cadastro de fornecedor estará disponível em breve.')
      return
    }

    setEnviando(true)
    try {
      await enviarCadastro(dados)
      navegar('/cadastro-pendente', {
        state: { perfil: dados.perfil, nome: dados.nome, cnpj: dados.cnpj },
      })
    } catch (falha) {
      // a mensagem já vem em português, inclusive quando o backend está fora do ar (ver infrastructure/api.js)
      setErro(falha.message)
      setEnviando(false)
    }
  }

  return { enviar, enviando, erro, aviso }
}
