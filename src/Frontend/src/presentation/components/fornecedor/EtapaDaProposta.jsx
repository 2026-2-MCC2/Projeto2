import { Link, Navigate } from 'react-router-dom'
import { traduzirStatusDaProposta } from '../../../application/propostas.js'
import { primeiraEtapaIncompleta } from '../../../application/rascunhosDePropostas.js'
import { Carregando, ErroNaTela, Vazio } from '../comum/EstadoDaTela.jsx'
import { PassosDasEtapas, ProgressoEtapas } from '../comum/ProgressoEtapas.jsx'
import { OrganizadorLayout } from '../organizador/OrganizadorLayout.jsx'
import { useIsMobile } from '../../hooks/useIsMobile.js'

const ETAPAS_PROPOSTA = ['Valor e validade', 'Descrição e fotos', 'Condições e envio']

// Moldura das 3 etapas do envio (ou da edição) de proposta: carregando, erro, item indisponível,
// proposta já analisada e, com tudo certo, o cabeçalho com o evento, o item e o progresso.
// children é uma função: só roda quando o evento e o item já chegaram.
//   <EtapaDaProposta proposta={usePropostaEmEdicao()} etapa={2} aoVoltar={...} rodape={acoes}>
//     {() => <form>...</form>}
//   </EtapaDaProposta>
export function EtapaDaProposta({ proposta, etapa, aoVoltar, rodape, children }) {
  const isMobile = useIsMobile()
  const { carregando, erro, evento, item, tentarDeNovo, eventKey } = proposta
  const paginaDoEvento = `/fornecedor/eventos/${eventKey}`
  const titulo = proposta.editando ? 'Editar proposta' : 'Enviar proposta'

  if (carregando) {
    return (
      <OrganizadorLayout perfil="fornecedor" titulo={titulo} voltarPara={paginaDoEvento}>
        <Carregando mensagem="Carregando o item…" />
      </OrganizadorLayout>
    )
  }

  if (erro && erro.status !== 404) {
    return (
      <OrganizadorLayout perfil="fornecedor" titulo={titulo} voltarPara={paginaDoEvento}>
        <ErroNaTela erro={erro} aoTentarDeNovo={tentarDeNovo} />
      </OrganizadorLayout>
    )
  }

  if (!item) {
    return (
      <OrganizadorLayout
        perfil="fornecedor"
        titulo="Item indisponível"
        voltarPara="/fornecedor/eventos"
      >
        <Vazio
          icone="atencao"
          titulo="Este item não está disponível para proposta"
          mensagem="O evento pode ter sido encerrado ou o item não está mais nas suas categorias."
        >
          <Link to="/fornecedor/eventos" className="botao botao--secundario">
            Ver eventos disponíveis
          </Link>
        </Vazio>
      </OrganizadorLayout>
    )
  }

  // proposta já analisada pelo organizador: só a consulta (a enviada vira edição, ver usePropostaEmEdicao)
  if (item.my_proposal && !proposta.editando) {
    return (
      <OrganizadorLayout perfil="fornecedor" titulo="Proposta enviada" voltarPara={paginaDoEvento}>
        <Vazio
          icone="atencao"
          titulo="Esta proposta não pode mais ser alterada"
          mensagem={`O organizador já decidiu sobre ela ou o evento saiu da cotação. Situação: ${traduzirStatusDaProposta(item.my_proposal.status)}.`}
        >
          <Link
            to={`/fornecedor/propostas/${item.my_proposal.proposal_key}`}
            className="botao botao--secundario"
          >
            Ver proposta
          </Link>
        </Vazio>
      </OrganizadorLayout>
    )
  }

  const etapaQueFalta = primeiraEtapaIncompleta(proposta.rascunho)
  if (etapaQueFalta !== null && etapaQueFalta < etapa) {
    return <Navigate to={proposta.rotaDaEtapa(etapaQueFalta)} replace />
  }

  return (
    <OrganizadorLayout
      perfil="fornecedor"
      titulo={titulo}
      sobreTitulo={`Eventos disponíveis · ${evento.name}`}
      apoio={`Item: ${item.description}`}
      voltarPara={aoVoltar ? undefined : paginaDoEvento}
      aoVoltar={aoVoltar}
      subCabecalho={
        isMobile ? <ProgressoEtapas etapas={ETAPAS_PROPOSTA} etapaAtual={etapa} /> : undefined
      }
      rodape={rodape}
    >
      {!isMobile && <PassosDasEtapas etapas={ETAPAS_PROPOSTA} etapaAtual={etapa} tom="sucesso" />}
      {children()}
    </OrganizadorLayout>
  )
}
