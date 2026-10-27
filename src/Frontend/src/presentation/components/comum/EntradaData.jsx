import { useRef } from 'react'
import { Icone } from './Icone.jsx'
import iconeCalendario from '../../assets/organizador/icone-eventos.svg'

// O teclado numérico do celular não tem "/": as barras entram sozinhas ("18102026" → "18/10/2026").
function comBarras(texto) {
  const numeros = texto.replace(/\D/g, '').slice(0, 8)
  return [numeros.slice(0, 2), numeros.slice(2, 4), numeros.slice(4)].filter(Boolean).join('/')
}

const paraIso = (texto) => {
  const [dia, mes, ano] = texto.split('/')
  return ano?.length === 4 ? `${ano}-${mes}-${dia}` : ''
}

// troca o valor como se a pessoa tivesse digitado, para o onChange do React e a validação verem
function preencher(campo, valor) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(campo, valor)
  campo.dispatchEvent(new Event('input', { bubbles: true }))
}

// semPassado: o calendário não deixa escolher datas antes de hoje
export function EntradaData({ onChange, semPassado = false, ...props }) {
  const texto = useRef(null)

  function aoDigitar(evento) {
    evento.target.value = comBarras(evento.target.value)
    onChange?.(evento)
  }

  function abrirCalendario(evento) {
    const calendario = evento.currentTarget
    calendario.value = paraIso(texto.current.value)
    try {
      calendario.showPicker?.()
    } catch {
      // sem showPicker o toque no próprio campo já abre o calendário
    }
  }

  function aoEscolher(evento) {
    const [ano, mes, dia] = evento.target.value.split('-')
    if (ano) preencher(texto.current, `${dia}/${mes}/${ano}`)
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
      <span className="entrada-data__calendario">
        <Icone src={iconeCalendario} />
        {/* invisível sobre o ícone; form="" tira ele da validação do formulário */}
        <input
          type="date"
          form=""
          tabIndex={-1}
          aria-hidden="true"
          min={semPassado ? new Date().toLocaleDateString('sv-SE') : undefined}
          onClick={abrirCalendario}
          onChange={aoEscolher}
        />
      </span>
    </span>
  )
}
