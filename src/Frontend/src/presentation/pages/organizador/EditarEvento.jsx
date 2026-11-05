import { useMemo } from 'react'
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
  const { evento, erroAoAtualizar, buscaConcluida, tentarDeNovo } = useEvento(id)
  const paginaDoEvento = `/organizador/eventos/${id}`
  // o formulário lê o valor inicial uma vez só: ele espera a versão da API para não salvar dados antigos
  const valorInicial = useMemo(() => evento && eventoParaFormulario(evento.raw), [evento])

  async function salvar(dados) {
    const eventoSalvo = await atualizarEvento(id, dados)
    toast.sucesso('Evento atualizado', { descricao: eventoSalvo.nome })
    navigate(paginaDoEvento, { viewTransition: true })
  }

  if (!buscaConcluida || !evento || !eventoPodeSerEditado(evento)) {
    return (
      <OrganizadorLayout titulo="Editar evento" voltarPara={paginaDoEvento}>
        {!buscaConcluida && !erroAoAtualizar && <Carregando mensagem="Carregando o evento…" />}
        {erroAoAtualizar && <ErroNaTela erro={erroAoAtualizar} aoTentarDeNovo={tentarDeNovo} />}
        {evento && buscaConcluida && (
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
      valorInicial={valorInicial}
      permiteDataPassada
      comCustosProprios={false}
      custoJaCadastrado={evento.raw.total_cost}
      avisoDaRevisao="Os custos próprios continuam na aba Itens de custo e não mudam por aqui."
      textoDoBotaoFinal="Salvar alterações"
      textoAoSalvar="Salvando..."
      destinoAoSair={paginaDoEvento}
      aoConcluir={salvar}
    />
  )
}
