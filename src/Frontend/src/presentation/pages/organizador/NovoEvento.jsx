import { useNavigate } from 'react-router-dom'
import { criarEvento } from '../../../application/eventos.js'
import { toast } from '../../toasts.js'
import { EVENTO_EM_BRANCO } from './novoEvento/eventoEmBranco.js'
import { FormularioDeEvento } from './novoEvento/FormularioDeEvento.jsx'

export function NovoEvento() {
  const navigate = useNavigate()

  // o evento nasce em planejamento: a publicação para cotação vem depois dos itens de custo
  async function criar(dados) {
    const novoEvento = await criarEvento(dados)
    toast.sucesso('Evento criado', {
      descricao: 'Cadastre os itens de custo e publique para cotação quando estiver pronto.',
    })
    navigate(`/organizador/eventos/${novoEvento.id}`, { viewTransition: true })
  }

  return (
    <FormularioDeEvento
      titulo="Novo evento"
      valorInicial={EVENTO_EM_BRANCO}
      comCustosProprios
      avisoDaRevisao="O evento fica em planejamento. Quando os itens de custo estiverem prontos, publique para cotação pela visão geral do evento."
      textoDoBotaoFinal="Criar evento"
      textoAoSalvar="Criando..."
      destinoAoSair="/organizador/eventos"
      aoConcluir={criar}
    />
  )
}
