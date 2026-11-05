import { OrganizadorLayout } from '../../components/organizador/OrganizadorLayout.jsx'
import { Vazio } from '../../components/comum/EstadoDaTela.jsx'
import { useIsMobile } from '../../hooks/useIsMobile.js'
import '../../styles/admin.css'

// a API ainda não tem rota que liste as decisões do admin: em vez de registros de exemplo, a tela
// avisa que o histórico não está disponível
export function Historico() {
  const isMobile = useIsMobile()

  return (
    <OrganizadorLayout
      perfil="admin"
      titulo={isMobile ? 'Histórico' : 'Histórico de alterações'}
      apoio="Registro das aprovações, rejeições e bloqueios realizados."
    >
      <Vazio
        icone="atencao"
        titulo="O histórico de decisões ainda não está disponível"
        mensagem="As aprovações, rejeições e bloqueios continuam valendo; só a listagem deles ainda não aparece aqui."
      />
    </OrganizadorLayout>
  )
}
