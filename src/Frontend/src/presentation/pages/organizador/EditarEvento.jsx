import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  atualizarEvento,
  eventoParaFormulario,
  eventoPodeSerEditado,
} from '../../../application/eventos.js'
import { Carregando, ErroNaTela, Vazio } from '../../components/comum/EstadoDaTela.jsx'
import { OrganizadorLayout } from '../../components/organizador/OrganizadorLayout.jsx'
import { useEvento } from '../../hooks/useEvento.js'
import { toast } from '../../toasts.js'
import { FormularioDeEvento } from './novoEvento/FormularioDeEvento.jsx'

export function EditarEvento() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { evento, carregando, erro, tentarDeNovo } = useEvento(id)
  const paginaDoEvento = `/organizador/eventos/${id}`

  async function salvar(dados) {
    const eventoSalvo = await atualizarEvento(id, dados)
    toast.sucesso('Evento atualizado', { descricao: eventoSalvo.nome })
    navigate(paginaDoEvento, { viewTransition: true })
  }

  if (carregando || erro || !evento || !eventoPodeSerEditado(evento.status)) {
    return (
      <OrganizadorLayout titulo="Editar evento" voltarPara={paginaDoEvento}>
        {carregando && <Carregando mensagem="Carregando o evento…" />}
        {erro && <ErroNaTela erro={erro} aoTentarDeNovo={tentarDeNovo} />}
        {evento && (
          <Vazio
            titulo="Este evento não pode mais ser editado"
            mensagem="Eventos aprovados ou cancelados ficam fechados para alteração."
          >
            <Link to={paginaDoEvento} className="botao botao--secundario">
              Voltar para o evento
            </Link>
          </Vazio>
        )}
      </OrganizadorLayout>
    )
  }

  return (
    <FormularioDeEvento
      titulo="Editar evento"
      valorInicial={eventoParaFormulario(evento.raw)}
      comCustosProprios={false}
      avisoDaRevisao="Os custos próprios continuam na aba Itens de custo e não mudam por aqui."
      textoDoBotaoFinal="Salvar alterações"
      textoAoSalvar="Salvando..."
      destinoAoSair={paginaDoEvento}
      aoConcluir={salvar}
    />
  )
}
