import { useEffect, useState, useSyncExternalStore } from 'react'
import { toast as filaDeToasts } from '../../toasts.js'
import { Icone } from './Icone.jsx'
import iconeSucesso from '../../assets/organizador/icone-concluido.svg'
import iconeInfo from '../../assets/organizador/icone-atencao.svg'
import iconeFechar from '../../assets/comum/icone-fechar.svg'

const ICONES = { sucesso: iconeSucesso, erro: iconeFechar, info: iconeInfo }

function CartaoDeToast({ toast }) {
  const [pausado, setPausado] = useState(false)

  useEffect(() => {
    if (pausado) return
    const temporizador = setTimeout(() => filaDeToasts.fechar(toast.id), toast.duracao)
    return () => clearTimeout(temporizador)
  }, [pausado, toast])

  return (
    <li
      className={`toast toast--${toast.tom}`}
      onPointerEnter={() => setPausado(true)}
      onPointerLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={() => setPausado(false)}
    >
      <span className="toast__icone" aria-hidden="true">
        <Icone src={ICONES[toast.tom]} />
      </span>

      <div className="toast__texto">
        <p className="toast__titulo">{toast.titulo}</p>
        {toast.descricao && <p className="toast__descricao">{toast.descricao}</p>}
      </div>

      {toast.acao && (
        <button
          type="button"
          className="toast__acao"
          onClick={() => {
            toast.acao.executar()
            filaDeToasts.fechar(toast.id)
          }}
        >
          {toast.acao.rotulo}
        </button>
      )}

      <button
        type="button"
        className="toast__fechar"
        aria-label="Fechar aviso"
        onClick={() => filaDeToasts.fechar(toast.id)}
      >
        <Icone src={iconeFechar} />
      </button>
    </li>
  )
}

// uma região viva por urgência, sempre na página (região criada junto com o aviso não é lida);
// os itens não têm papel próprio, para não aninhar uma região dentro da outra
export function Toaster() {
  const toasts = useSyncExternalStore(filaDeToasts.inscrever, filaDeToasts.atuais)
  const avisos = toasts.filter((toast) => toast.tom !== 'erro')
  const erros = toasts.filter((toast) => toast.tom === 'erro')

  return (
    <div className="toaster">
      <ol className="toaster__lista" aria-live="polite">
        {avisos.map((toast) => (
          <CartaoDeToast key={toast.id} toast={toast} />
        ))}
      </ol>
      <ol className="toaster__lista" aria-live="assertive">
        {erros.map((toast) => (
          <CartaoDeToast key={toast.id} toast={toast} />
        ))}
      </ol>
    </div>
  )
}
