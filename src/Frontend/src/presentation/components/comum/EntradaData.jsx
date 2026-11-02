import { useRef, useState } from 'react'
import { Icone } from './Icone.jsx'
import { Calendario } from './Calendario.jsx'
import iconeCalendario from '../../assets/organizador/icone-eventos.svg'

// O teclado numérico do celular não tem "/": as barras entram sozinhas ("18102026" → "18/10/2026").
function comBarras(texto) {
  const numeros = texto.replace(/\D/g, '').slice(0, 8)
  return [numeros.slice(0, 2), numeros.slice(2, 4), numeros.slice(4)].filter(Boolean).join('/')
}

// troca o valor como se a pessoa tivesse digitado, para o onChange do React e a validação verem
function preencher(campo, valor) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(campo, valor)
  campo.dispatchEvent(new Event('input', { bubbles: true }))
}

// semPassado: o calendário não deixa escolher datas antes de hoje
export function EntradaData({ onChange, semPassado = false, ...props }) {
  const texto = useRef(null)
  const [aberto, setAberto] = useState(false)

  function aoDigitar(evento) {
    evento.target.value = comBarras(evento.target.value)
    onChange?.(evento)
  }

  function aoSelecionarData(dataStr) {
    if (texto.current) {
      preencher(texto.current, dataStr)
      onChange?.({ target: texto.current })
    }
  }

  return (
    <span className="entrada-data">
      <input
        ref={texto}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        maxLength={10}
        placeholder="dd/mm/aaaa"
        className="entrada-data__texto"
        {...props}
        onChange={aoDigitar}
      />
      <button
        type="button"
        className="entrada-data__calendario"
        aria-label="Abrir calendário"
        onClick={() => setAberto((estaAberto) => !estaAberto)}
      >
        <Icone src={iconeCalendario} />
      </button>

      {aberto && (
        <Calendario
          valor={texto.current?.value || props.value}
          semPassado={semPassado}
          aoSelecionar={aoSelecionarData}
          aoFechar={() => setAberto(false)}
        />
      )}
    </span>
  )
}
