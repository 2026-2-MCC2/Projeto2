import { AppRoutes } from './presentation/routes/AppRoutes.jsx'
import { LimiteDeErro } from './presentation/components/comum/LimiteDeErro.jsx'
import './presentation/styles/global.css'

export default function App() {
  return (
    <LimiteDeErro>
      <AppRoutes />
    </LimiteDeErro>
  )
}
