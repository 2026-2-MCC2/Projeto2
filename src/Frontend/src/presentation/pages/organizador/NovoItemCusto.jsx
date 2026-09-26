import { useNavigate, useParams } from 'react-router-dom'
import { OrganizadorLayout } from '../../components/organizador/OrganizadorLayout.jsx'
import { CamposDoItem } from '../../components/organizador/CamposDoItem.jsx'
import { Acoes, Botao } from '../../components/organizador/Formulario.jsx'
import { buscarEvento } from '../../data/eventos.js'

export function NovoItemCusto() {
  const { id } = useParams()
  const navigate = useNavigate()
  const evento = buscarEvento(id)

  const voltar = () => navigate(`/organizador/eventos/${id}/itens`, { viewTransition: true })

  const acoes = (
    <Acoes>
      <Botao type="submit" form="form-novo-item">
        Adicionar item
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
          voltar()
        }}
      >
        <p className="secao__apoio">{evento?.detalhe?.nomeCompleto}</p>

        <CamposDoItem isMobile linhas={3} />
      </form>
    </OrganizadorLayout>
  )
}
