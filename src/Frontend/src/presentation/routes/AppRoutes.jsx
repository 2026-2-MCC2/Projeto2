import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { NaoEncontrada } from '../pages/NaoEncontrada.jsx'
import { Login } from '../pages/acesso/Login.jsx'
import { Cadastro } from '../pages/acesso/Cadastro.jsx'
import { RecuperarSenha } from '../pages/acesso/RecuperarSenha.jsx'
import { CadastroPendente } from '../pages/acesso/CadastroPendente.jsx'

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/recuperar-senha" element={<RecuperarSenha />} />
        <Route path="/cadastro-pendente" element={<CadastroPendente />} />

        <Route path="*" element={<NaoEncontrada />} />
      </Routes>
    </BrowserRouter>
  )
}
