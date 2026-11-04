import { useEffect, useRef, useState } from 'react'
import {
  DIAS_DA_SEMANA,
  ehAnterior,
  formatarParaInput,
  gerarGradeDoMes,
  NOMES_DOS_MESES,
  paraDataLocal,
  saoMesmoDia,
} from '../../../domain/calendario.js'
import { Icone } from './Icone.jsx'
import iconeVoltar from '../../assets/organizador/icone-voltar.svg'
import iconeAvancar from '../../assets/organizador/icone-avancar.svg'

export function Calendario({ valor, aoSelecionar, aoFechar, semPassado = false, minData = null }) {
  const containerRef = useRef(null)
  const dataSelecionada = paraDataLocal(valor)
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  // O mês inicial visualizado é o da data selecionada, ou o mês corrente
  const [dataVisualizada, setDataVisualizada] = useState(() => {
    return dataSelecionada ? new Date(dataSelecionada) : new Date(hoje)
  })

  const anoAtual = dataVisualizada.getFullYear()
  const mesAtual = dataVisualizada.getMonth()

  const anoMinimo = Math.min(hoje.getFullYear() - 10, anoAtual - 5)
  const anoMaximo = Math.max(hoje.getFullYear() + 15, anoAtual + 5)
  const anosDisponiveis = Array.from({ length: anoMaximo - anoMinimo + 1 }, (_, i) => anoMinimo + i)

  const diasGrade = gerarGradeDoMes(anoAtual, mesAtual)
  const dataLimite = semPassado ? hoje : minData

  function mesAnterior(e) {
    e.stopPropagation()
    setDataVisualizada(new Date(anoAtual, mesAtual - 1, 1))
  }

  function mesProximo(e) {
    e.stopPropagation()
    setDataVisualizada(new Date(anoAtual, mesAtual + 1, 1))
  }

  function mudarMes(e) {
    e.stopPropagation()
    const novoMes = Number(e.target.value)
    setDataVisualizada(new Date(anoAtual, novoMes, 1))
  }

  function mudarAno(e) {
    e.stopPropagation()
    const novoAno = Number(e.target.value)
    setDataVisualizada(new Date(novoAno, mesAtual, 1))
  }

  function selecionarDia(diaObj, e) {
    e.stopPropagation()
    const textoFormatado = formatarParaInput(diaObj.data)
    aoSelecionar?.(textoFormatado)
    aoFechar?.()
  }

  function irParaHoje(e) {
    e.stopPropagation()
    setDataVisualizada(new Date(hoje))
    const textoFormatado = formatarParaInput(hoje)
    aoSelecionar?.(textoFormatado)
    aoFechar?.()
  }

  // Fecha ao clicar fora ou ao teclar Escape
  useEffect(() => {
    function tratarCliqueFora(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        aoFechar?.()
      }
    }

    function tratarTeclado(e) {
      if (e.key === 'Escape') {
        aoFechar?.()
      }
    }

    document.addEventListener('mousedown', tratarCliqueFora)
    document.addEventListener('keydown', tratarTeclado)
    return () => {
      document.removeEventListener('mousedown', tratarCliqueFora)
      document.removeEventListener('keydown', tratarTeclado)
    }
  }, [aoFechar])

  return (
    <>
      <div className="calendario-backdrop" onClick={aoFechar} aria-hidden="true" />
      <div
        ref={containerRef}
        className="calendario-popover"
        role="dialog"
        aria-modal="true"
        aria-label="Escolher data no calendário"
      >
        <header className="calendario__cabecalho">
          <button
            type="button"
            className="calendario__navegacao"
            aria-label="Mês anterior"
            onClick={mesAnterior}
          >
            <Icone src={iconeVoltar} />
          </button>

          <div className="calendario__seletores">
            <select
              className="calendario__seletor calendario__seletor--mes"
              aria-label="Selecionar mês"
              value={mesAtual}
              onChange={mudarMes}
            >
              {NOMES_DOS_MESES.map((nomeMes, indice) => (
                <option key={nomeMes} value={indice}>
                  {nomeMes}
                </option>
              ))}
            </select>

            <select
              className="calendario__seletor calendario__seletor--ano"
              aria-label="Selecionar ano"
              value={anoAtual}
              onChange={mudarAno}
            >
              {anosDisponiveis.map((ano) => (
                <option key={ano} value={ano}>
                  {ano}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="calendario__navegacao"
            aria-label="Próximo mês"
            onClick={mesProximo}
          >
            <Icone src={iconeAvancar} />
          </button>
        </header>

        <div className="calendario__dias-semana" aria-hidden="true">
          {DIAS_DA_SEMANA.map((diaSemana) => (
            <span key={diaSemana} className="calendario__dia-semana">
              {diaSemana}
            </span>
          ))}
        </div>

        <div className="calendario__grade" role="grid">
          {diasGrade.map((diaObj) => {
            const desabilitado = dataLimite ? ehAnterior(diaObj.data, dataLimite) : false
            const eSelecionado = saoMesmoDia(diaObj.data, dataSelecionada)
            const eHoje = saoMesmoDia(diaObj.data, hoje)

            let classes = 'calendario__dia'
            if (!diaObj.eDoMesAtual) classes += ' calendario__dia--outro-mes'
            if (eHoje) classes += ' calendario__dia--hoje'
            if (eSelecionado) classes += ' calendario__dia--selecionado'
            if (desabilitado) classes += ' calendario__dia--desabilitado'

            return (
              <button
                key={diaObj.chave}
                type="button"
                className={classes}
                disabled={desabilitado}
                aria-label={`${diaObj.dia} de ${NOMES_DOS_MESES[diaObj.mes]} de ${diaObj.ano}`}
                aria-selected={eSelecionado}
                onClick={(e) => !desabilitado && selecionarDia(diaObj, e)}
              >
                {diaObj.dia}
              </button>
            )
          })}
        </div>

        <footer className="calendario__rodape">
          <button type="button" className="calendario__botao-hoje" onClick={irParaHoje}>
            Hoje
          </button>
          <button type="button" className="calendario__botao-fechar" onClick={aoFechar}>
            Fechar
          </button>
        </footer>
      </div>
    </>
  )
}
