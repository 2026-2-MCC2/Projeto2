import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { NaoEncontrada } from '../pages/NaoEncontrada.jsx'
import { Login } from '../pages/acesso/Login.jsx'
import { Cadastro } from '../pages/acesso/Cadastro.jsx'
import { RecuperarSenha } from '../pages/acesso/RecuperarSenha.jsx'
import { CadastroPendente } from '../pages/acesso/CadastroPendente.jsx'
import { Eventos } from '../pages/organizador/Eventos.jsx'
import { NovoEvento } from '../pages/organizador/NovoEvento.jsx'
import { EventoVisaoGeral } from '../pages/organizador/EventoVisaoGeral.jsx'
import { EventoItens } from '../pages/organizador/EventoItens.jsx'
import { EventoPropostas } from '../pages/organizador/EventoPropostas.jsx'
import { EventoTicket } from '../pages/organizador/EventoTicket.jsx'
import { PropostaRecebida } from '../pages/organizador/PropostaRecebida.jsx'
import { Configuracoes } from '../pages/organizador/Configuracoes.jsx'

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/recuperar-senha" element={<RecuperarSenha />} />
        <Route path="/cadastro-pendente" element={<CadastroPendente />} />

        <Route path="/organizador/eventos" element={<Eventos />} />
        <Route path="/organizador/eventos/novo" element={<NovoEvento />} />
        <Route path="/organizador/eventos/:id" element={<EventoVisaoGeral />} />
        <Route path="/organizador/eventos/:id/itens" element={<EventoItens />} />
        <Route path="/organizador/eventos/:id/propostas" element={<EventoPropostas />} />
        <Route path="/organizador/eventos/:id/propostas/:proposta" element={<PropostaRecebida />} />
        <Route path="/organizador/eventos/:id/ticket" element={<EventoTicket />} />
        <Route path="/organizador/configuracoes" element={<Configuracoes />} />

        <Route path="*" element={<NaoEncontrada />} />
      </Routes>
    </BrowserRouter>
  )
}
