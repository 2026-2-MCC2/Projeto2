import { useRef, useState } from 'react'
import { Icone } from './Icone.jsx'
import { Calendario } from './Calendario.jsx'
import iconeCalendario from '../../assets/organizador/icone-eventos.svg'

// o teclado numérico do celular não tem "/": as barras entram sozinhas
function comBarras(texto) {
  const numeros = texto.replace(/\D/g, '').slice(0, 8)
  return [numeros.slice(0, 2), numeros.slice(2, 4), numeros.slice(4)].filter(Boolean).join('/')
}

// troca o valor como se a pessoa tivesse digitado, para o onChange do React e a validação verem
function preencher(campo, valor) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(campo, valor)
  campo.dispatchEvent(new Event('input', { bubbles: true }))
}

export function EntradaData({ onChange, semPassado = false, periodo = null, ...props }) {
  const texto = useRef(null)
  // a data digitada é lida ao abrir o calendário, fora da renderização (null = fechado)
  const [dataAoAbrir, setDataAoAbrir] = useState(null)
  const aberto = dataAoAbrir !== null

  function alternarCalendario() {
    setDataAoAbrir(aberto ? null : (texto.current?.value ?? ''))
  }

  function aoDigitar(evento) {
    evento.target.value = comBarras(evento.target.value)
    onChange?.(evento)
  }

  // o calendário fecha no mousedown fora dele; sem isto o clique no ícone fecharia e reabriria
  function ignorarCliqueForaDoCalendario(evento) {
    evento.stopPropagation()
  }

  // o evento disparado por preencher já chega ao onChange pelo aoDigitar
  function aoSelecionarData(dataStr) {
    if (texto.current) preencher(texto.current, dataStr)
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
        aria-haspopup="dialog"
        aria-expanded={aberto}
        onClick={alternarCalendario}
        onMouseDown={ignorarCliqueForaDoCalendario}
      >
        <Icone src={iconeCalendario} />
      </button>

      {aberto && (
        <Calendario
          valor={props.value ?? dataAoAbrir}
          semPassado={semPassado}
          periodo={periodo}
          aoSelecionar={aoSelecionarData}
          aoFechar={() => setDataAoAbrir(null)}
        />
      )}
    </span>
  )
}
