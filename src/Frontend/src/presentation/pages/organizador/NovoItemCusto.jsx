import { useNavigate, useParams } from 'react-router-dom'
import { OrganizadorLayout } from '../../components/organizador/OrganizadorLayout.jsx'
import { CamposDoItem } from '../../components/organizador/CamposDoItem.jsx'
import { Acoes, Botao } from '../../components/organizador/Formulario.jsx'
import { useEvento } from '../../hooks/useEvento.js'
import { useValidacao } from '../../hooks/useValidacao.js'
import { useNovoItemDeCusto } from '../../hooks/useNovoItemDeCusto.js'

export function NovoItemCusto() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { evento } = useEvento(id)
  const validacao = useValidacao()

  const voltar = () => navigate(`/organizador/eventos/${id}/itens`, { viewTransition: true })
  const { dados, definir, enviando, salvar } = useNovoItemDeCusto(id, voltar)

  const acoes = (
    <Acoes>
      <Botao type="submit" form="form-novo-item" disabled={enviando}>
        {enviando ? 'Salvando...' : 'Adicionar item'}
      </Botao>
    </Acoes>
  )

  return (
    <OrganizadorLayout titulo="Novo item de custo" aoVoltar={voltar} rodape={acoes}>
      <form
        id="form-novo-item"
        className="novo-evento-form"
        onSubmit={(submissao) => {
          submissao.preventDefault()
          salvar()
        }}
        {...validacao}
      >
        <p className="secao__apoio">{evento?.detalhe?.nomeCompleto}</p>

        <CamposDoItem dados={dados} definir={definir} isMobile linhas={3} />
      </form>
    </OrganizadorLayout>
  )
}
