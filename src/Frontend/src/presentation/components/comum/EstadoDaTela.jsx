import { Icone } from './Icone.jsx'
import iconeEventos from '../../assets/comum/icone-estado-eventos.svg'
import iconePropostas from '../../assets/comum/icone-estado-propostas.svg'
import iconeAtencao from '../../assets/comum/icone-estado-atencao.svg'

// telaInteira: para quando ainda não há layout (carregando uma rota)
export function Carregando({ mensagem = 'Carregando…', telaInteira = false }) {
  return (
    <div
      className={`estado-tela${telaInteira ? ' estado-tela--pagina' : ''}`}
      role="status"
      aria-live="polite"
    >
      <span className="estado-tela__indicador" aria-hidden="true" />
      <p>{mensagem}</p>
    </div>
  )
}

export function ErroNaTela({ erro, aoTentarDeNovo }) {
  return (
    <div className="estado-tela estado-tela--erro" role="alert">
      <strong>Não foi possível carregar.</strong>
      <p>{erro?.message ?? 'Tente novamente em alguns instantes.'}</p>
      {aoTentarDeNovo && (
        <button type="button" className="botao botao--secundario" onClick={aoTentarDeNovo}>
          Tentar de novo
        </button>
      )}
    </div>
  )
}

const ICONES_DO_ESTADO = {
  eventos: iconeEventos,
  propostas: iconePropostas,
  atencao: iconeAtencao,
}

// icone: 'eventos', 'propostas' ou 'atencao' (este em laranja, para o que ficou indisponível)
export function Vazio({ titulo, mensagem, icone, children }) {
  return (
    <div className="estado-tela" role="status">
      {icone && (
        <span className={`estado-tela__icone estado-tela__icone--${icone}`}>
          <Icone src={ICONES_DO_ESTADO[icone]} />
        </span>
      )}
      <strong>{titulo}</strong>
      {mensagem && <p>{mensagem}</p>}
      {children}
    </div>
  )
}
