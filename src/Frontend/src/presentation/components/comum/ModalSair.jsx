import { useNavigate } from 'react-router-dom'
import { sair, ROTA_DO_LOGIN } from '../../../application/sessao.js'
import { useLeituraEmVozAlta } from '../../hooks/useLeituraEmVozAlta.js'
import { Modal } from './Modal.jsx'
import icone from '../../assets/comum/icone-enviar.svg'

export function ModalSair({ aoFechar }) {
  const navigate = useNavigate()
  const leitura = useLeituraEmVozAlta()

  function aoConfirmar() {
    leitura.parar()
    sair()
    navigate(ROTA_DO_LOGIN, { replace: true })
  }

  return (
    <Modal
      icone={icone}
      titulo="Sair da sua conta?"
      mensagem="Você voltará para a tela de login e precisará entrar novamente com e-mail e senha."
      acao={{ cancelar: 'Cancelar', confirmar: 'Sair', aoConfirmar: aoConfirmar }}
      aoFechar={aoFechar}
    />
  )
}
