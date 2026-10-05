import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { NaoEncontrada } from '../pages/NaoEncontrada.jsx'
import { Login } from '../pages/acesso/Login.jsx'
import { Cadastro } from '../pages/acesso/Cadastro.jsx'
import { RecuperarSenha } from '../pages/acesso/RecuperarSenha.jsx'
import { CadastroPendente } from '../pages/acesso/CadastroPendente.jsx'
import { Eventos } from '../pages/organizador/Eventos.jsx'
import { NovoEvento } from '../pages/organizador/NovoEvento.jsx'
import { EventoVisaoGeral } from '../pages/organizador/EventoVisaoGeral.jsx'
import { EventoItens } from '../pages/organizador/EventoItens.jsx'
import { NovoItemCusto } from '../pages/organizador/NovoItemCusto.jsx'
import { EventoPropostas } from '../pages/organizador/EventoPropostas.jsx'
import { EventoTicket } from '../pages/organizador/EventoTicket.jsx'
import { PropostaRecebida } from '../pages/organizador/PropostaRecebida.jsx'
import { Configuracoes } from '../pages/organizador/Configuracoes.jsx'
import { EventosDisponiveis } from '../pages/fornecedor/EventosDisponiveis.jsx'
import { EnviarProposta } from '../pages/fornecedor/EnviarProposta.jsx'
import { EnviarPropostaEtapa2 } from '../pages/fornecedor/EnviarPropostaEtapa2.jsx'
import { EnviarPropostaEtapa3 } from '../pages/fornecedor/EnviarPropostaEtapa3.jsx'
import { MinhasPropostas } from '../pages/fornecedor/MinhasPropostas.jsx'
import { Aprovacoes } from '../pages/admin/Aprovacoes.jsx'
import { Usuarios } from '../pages/admin/Usuarios.jsx'

export function AppRoutes() {
  return (
    <BrowserRouter>
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
        <Route path="/organizador/eventos/:id/propostas/:proposta" element={<PropostaRecebida />} />
        <Route path="/organizador/eventos/:id/ticket" element={<EventoTicket />} />
        <Route path="/organizador/configuracoes" element={<Configuracoes />} />

        <Route path="/fornecedor/eventos" element={<EventosDisponiveis />} />
        <Route path="/fornecedor/propostas" element={<MinhasPropostas />} />
        <Route path="/fornecedor/eventos/:id/propostas/etapa-1" element={<EnviarProposta />} />
        <Route
          path="/fornecedor/eventos/:id/propostas/etapa-2"
          element={<EnviarPropostaEtapa2 />}
        />
        <Route
          path="/fornecedor/eventos/:id/propostas/etapa-3"
          element={<EnviarPropostaEtapa3 />}
        />

        <Route path="/admin/aprovacoes" element={<Aprovacoes />} />
        <Route path="/admin/usuarios" element={<Usuarios />} />

        <Route path="*" element={<NaoEncontrada />} />
      </Routes>
    </BrowserRouter>
  )
}
