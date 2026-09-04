import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from '../components/Layout.jsx'
import { BoasVindas } from '../pages/BoasVindas.jsx'
import { NaoEncontrada } from '../pages/NaoEncontrada.jsx'

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<BoasVindas />} />
          <Route path="*" element={<NaoEncontrada />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
