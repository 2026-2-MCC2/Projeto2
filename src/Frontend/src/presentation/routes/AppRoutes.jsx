import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Carregando } from '../components/comum/EstadoDaTela.jsx'
import { NaoEncontrada } from '../pages/NaoEncontrada.jsx'
import { Landing } from '../pages/Landing.jsx'
import { Login } from '../pages/acesso/Login.jsx'
import { Cadastro } from '../pages/acesso/Cadastro.jsx'
import { RecuperarSenha } from '../pages/acesso/RecuperarSenha.jsx'
import { RedefinirSenha } from '../pages/acesso/RedefinirSenha.jsx'
import { CadastroPendente } from '../pages/acesso/CadastroPendente.jsx'
import { AreaDoPerfil } from './AreaDoPerfil.jsx'

// o lazy() espera export default, por isso cada página é pega pelo nome
const paginasDe = (carregar) => (nome) =>
  lazy(() => carregar().then((modulo) => ({ default: modulo[nome] })))

const doOrganizador = paginasDe(() => import('../pages/organizador/index.js'))
const doFornecedor = paginasDe(() => import('../pages/fornecedor/index.js'))
const doAdmin = paginasDe(() => import('../pages/admin/index.js'))
const comuns = paginasDe(() => import('../pages/comuns.js'))

const Eventos = doOrganizador('Eventos')
const NovoEvento = doOrganizador('NovoEvento')
const EditarEvento = doOrganizador('EditarEvento')
const EventoVisaoGeral = doOrganizador('EventoVisaoGeral')
const EventoItens = doOrganizador('EventoItens')
const NovoItemCusto = doOrganizador('NovoItemCusto')
const EventoPropostas = doOrganizador('EventoPropostas')
const EventoTicket = doOrganizador('EventoTicket')
const PropostaRecebida = doOrganizador('PropostaRecebida')
const Configuracoes = comuns('Configuracoes')
const Duvidas = comuns('Duvidas')
const EventosDisponiveis = doFornecedor('EventosDisponiveis')
const EventoDisponivel = doFornecedor('EventoDisponivel')
const EnviarProposta = doFornecedor('EnviarProposta')
const EnviarPropostaEtapa2 = doFornecedor('EnviarPropostaEtapa2')
const EnviarPropostaEtapa3 = doFornecedor('EnviarPropostaEtapa3')
const MinhasPropostas = doFornecedor('MinhasPropostas')
const DetalheDaProposta = doFornecedor('DetalheDaProposta')
const Aprovacoes = doAdmin('Aprovacoes')
const Historico = doAdmin('Historico')
const Usuarios = doAdmin('Usuarios')
const VisaoGeral = doAdmin('VisaoGeral')

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Carregando telaInteira />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/entrar" element={<Login />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route path="/recuperar-senha" element={<RecuperarSenha />} />
          <Route path="/redefinir-senha" element={<RedefinirSenha />} />
          <Route path="/cadastro-pendente" element={<CadastroPendente />} />

          {/* áreas logadas: só abrem com login e com o perfil certo (ver AreaDoPerfil.jsx) */}
          <Route element={<AreaDoPerfil perfil="organizador" />}>
            <Route path="/organizador" element={<Navigate to="/organizador/eventos" replace />} />
            <Route path="/organizador/eventos" element={<Eventos />} />
            <Route path="/organizador/eventos/novo" element={<NovoEvento />} />
            <Route path="/organizador/eventos/:id" element={<EventoVisaoGeral />} />
            <Route path="/organizador/eventos/:id/editar" element={<EditarEvento />} />
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
          </Route>

          <Route element={<AreaDoPerfil perfil="fornecedor" />}>
            <Route path="/fornecedor" element={<Navigate to="/fornecedor/eventos" replace />} />
            <Route path="/fornecedor/eventos" element={<EventosDisponiveis />} />
            <Route path="/fornecedor/eventos/:id" element={<EventoDisponivel />} />
            <Route path="/fornecedor/propostas" element={<MinhasPropostas />} />
            <Route path="/fornecedor/propostas/:proposalKey" element={<DetalheDaProposta />} />
            <Route
              path="/fornecedor/configuracoes"
              element={<Configuracoes perfil="fornecedor" />}
            />
            <Route path="/fornecedor/duvidas" element={<Duvidas perfil="fornecedor" />} />
            <Route
              path="/fornecedor/eventos/:id/itens/:itemKey/propostas/etapa-1"
              element={<EnviarProposta />}
            />
            <Route
              path="/fornecedor/eventos/:id/itens/:itemKey/propostas/etapa-2"
              element={<EnviarPropostaEtapa2 />}
            />
            <Route
              path="/fornecedor/eventos/:id/itens/:itemKey/propostas/etapa-3"
              element={<EnviarPropostaEtapa3 />}
            />
          </Route>

          <Route element={<AreaDoPerfil perfil="admin" />}>
            <Route path="/admin" element={<Navigate to="/admin/aprovacoes" replace />} />
            <Route path="/admin/aprovacoes" element={<Aprovacoes />} />
            <Route path="/admin/usuarios" element={<Usuarios />} />
            <Route path="/admin/historico" element={<Historico />} />
            <Route path="/admin/visao-geral" element={<VisaoGeral />} />
            <Route path="/admin/configuracoes" element={<Configuracoes perfil="admin" />} />
            <Route path="/admin/duvidas" element={<Duvidas perfil="admin" />} />
          </Route>

          <Route path="*" element={<NaoEncontrada />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
