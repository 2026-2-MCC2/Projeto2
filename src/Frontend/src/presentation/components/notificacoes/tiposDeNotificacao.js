import iconeMensagem from '../../assets/comum/icone-notificacao-mensagem.svg'
import iconeProposta from '../../assets/comum/icone-notificacao-proposta.svg'
import iconeEditada from '../../assets/comum/icone-notificacao-editada.svg'
import iconeRetirada from '../../assets/comum/icone-notificacao-retirada.svg'
import iconeAceita from '../../assets/comum/icone-notificacao-aceita.svg'
import iconeRecusada from '../../assets/comum/icone-notificacao-recusada.svg'
import iconeCancelada from '../../assets/comum/icone-notificacao-cancelada.svg'
import iconeEvento from '../../assets/comum/icone-notificacao-evento.svg'
import iconeCadastro from '../../assets/admin/icone-usuarios.svg'

// o tom escolhe a cor do círculo do ícone em notificacoes.css
const TIPOS = {
  message: { icone: iconeMensagem, tom: 'marca' },
  proposal_received: { icone: iconeProposta, tom: 'marca' },
  proposal_updated: { icone: iconeEditada, tom: 'marca' },
  proposal_withdrawn: { icone: iconeRetirada, tom: 'alerta' },
  proposal_accepted: { icone: iconeAceita, tom: 'sucesso' },
  proposal_rejected: { icone: iconeRecusada, tom: 'perigo' },
  event_canceled: { icone: iconeCancelada, tom: 'perigo' },
  event_published: { icone: iconeEvento, tom: 'marca' },
  user_pending: { icone: iconeCadastro, tom: 'alerta' },
}

export const tipoDaNotificacao = (tipo) => TIPOS[tipo] ?? TIPOS.message

export function filtrarNotificacoes(itens, filtro) {
  return filtro === 'nao-lidas' ? itens.filter((item) => !item.read) : itens
}

// notificação de mensagem abre a proposta já com a conversa aberta
export const destinoDaNotificacao = ({ type, link }) =>
  type === 'message' ? `${link}?conversa=1` : link
