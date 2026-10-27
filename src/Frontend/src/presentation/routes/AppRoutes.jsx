import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Carregando } from '../components/comum/EstadoDaTela.jsx'
import { NaoEncontrada } from '../pages/NaoEncontrada.jsx'
import { Login } from '../pages/acesso/Login.jsx'
import { Cadastro } from '../pages/acesso/Cadastro.jsx'
import { RecuperarSenha } from '../pages/acesso/RecuperarSenha.jsx'
import { CadastroPendente } from '../pages/acesso/CadastroPendente.jsx'

// A área logada fica fora do pacote inicial: cada perfil vira um arquivo, baixado só quando uma
// das suas telas abre. O lazy() espera export default, por isso cada página é pega pelo nome.
const paginasDe = (carregar) => (nome) =>
  lazy(() => carregar().then((modulo) => ({ default: modulo[nome] })))

const doOrganizador = paginasDe(() => import('../pages/organizador/index.js'))
const doFornecedor = paginasDe(() => import('../pages/fornecedor/index.js'))
const doAdmin = paginasDe(() => import('../pages/admin/index.js'))
const comuns = paginasDe(() => import('../pages/comuns.js'))

const Eventos = doOrganizador('Eventos')
const NovoEvento = doOrganizador('NovoEvento')
const EventoVisaoGeral = doOrganizador('EventoVisaoGeral')
const EventoItens = doOrganizador('EventoItens')
const NovoItemCusto = doOrganizador('NovoItemCusto')
const EventoPropostas = doOrganizador('EventoPropostas')
const EventoTicket = doOrganizador('EventoTicket')
const PropostaRecebida = doOrganizador('PropostaRecebida')
const Configuracoes = comuns('Configuracoes')
const Duvidas = comuns('Duvidas')
const EventosDisponiveis = doFornecedor('EventosDisponiveis')
const EnviarProposta = doFornecedor('EnviarProposta')
const EnviarPropostaEtapa2 = doFornecedor('EnviarPropostaEtapa2')
const EnviarPropostaEtapa3 = doFornecedor('EnviarPropostaEtapa3')
const MinhasPropostas = doFornecedor('MinhasPropostas')
const Aprovacoes = doAdmin('Aprovacoes')
const Historico = doAdmin('Historico')
const Usuarios = doAdmin('Usuarios')
const VisaoGeral = doAdmin('VisaoGeral')

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Carregando telaInteira />}>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route path="/recuperar-senha" element={<RecuperarSenha />} />
          <Route path="/cadastro-pendente" element={<CadastroPendente />} />

          <Route path="/organizador" element={<Navigate to="/organizador/eventos" replace />} />
          <Route path="/organizador/eventos" element={<Eventos />} />
          <Route path="/organizador/eventos/novo" element={<NovoEvento />} />
          <Route path="/organizador/eventos/:id" element={<EventoVisaoGeral />} />
          <Route path="/organizador/eventos/:id/itens" element={<EventoItens />} />
          <Route path="/organizador/eventos/:id/itens/novo" element={<NovoItemCusto />} />
          <Route path="/organizador/eventos/:id/propostas" element={<EventoPropostas />} />
          <Route
            path="/organizador/eventos/:id/propostas/:proposta"
            element={<PropostaRecebida />}
          />
          <Route path="/organizador/eventos/:id/ticket" element={<EventoTicket />} />
          <Route path="/organizador/configuracoes" element={<Configuracoes />} />
          <Route path="/organizador/duvidas" element={<Duvidas />} />

          <Route path="/fornecedor" element={<Navigate to="/fornecedor/eventos" replace />} />
          <Route path="/fornecedor/eventos" element={<EventosDisponiveis />} />
          <Route path="/fornecedor/propostas" element={<MinhasPropostas />} />
          <Route path="/fornecedor/configuracoes" element={<Configuracoes perfil="fornecedor" />} />
          <Route path="/fornecedor/duvidas" element={<Duvidas perfil="fornecedor" />} />
          <Route path="/fornecedor/eventos/:id/propostas/etapa-1" element={<EnviarProposta />} />
          <Route
            path="/fornecedor/eventos/:id/propostas/etapa-2"
            element={<EnviarPropostaEtapa2 />}
          />
          <Route
            path="/fornecedor/eventos/:id/propostas/etapa-3"
            element={<EnviarPropostaEtapa3 />}
          />

          <Route path="/admin" element={<Navigate to="/admin/aprovacoes" replace />} />
          <Route path="/admin/aprovacoes" element={<Aprovacoes />} />
          <Route path="/admin/usuarios" element={<Usuarios />} />
          <Route path="/admin/historico" element={<Historico />} />
          <Route path="/admin/visao-geral" element={<VisaoGeral />} />
          <Route path="/admin/configuracoes" element={<Configuracoes perfil="admin" />} />
          <Route path="/admin/duvidas" element={<Duvidas perfil="admin" />} />

          <Route path="*" element={<NaoEncontrada />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
