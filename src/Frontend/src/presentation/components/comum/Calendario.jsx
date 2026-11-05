import { useEffect, useLayoutEffect, useRef, useState } from 'react'
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

const ANOS_POR_PAGINA = 12

// clicar no título sobe de nível: dias → meses → anos; escolher um mês ou ano desce de volta
export function Calendario({ valor, aoSelecionar, aoFechar, semPassado = false, minData = null }) {
  const containerRef = useRef(null)
  const dataSelecionada = paraDataLocal(valor)
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const dataLimite = semPassado ? hoje : minData

  const [dataVisualizada, setDataVisualizada] = useState(() =>
    dataSelecionada ? new Date(dataSelecionada) : new Date(hoje),
  )
  const [visao, setVisao] = useState('dias')
  const [abreParaCima, setAbreParaCima] = useState(false)

  const ano = dataVisualizada.getFullYear()
  const mes = dataVisualizada.getMonth()
  // a página de anos começa no ano atual: evento se planeja para frente
  const inicioDasPaginas = hoje.getFullYear()
  const primeiroAnoDaPagina =
    inicioDasPaginas + Math.floor((ano - inicioDasPaginas) / ANOS_POR_PAGINA) * ANOS_POR_PAGINA

  useLayoutEffect(() => {
    const caixa = containerRef.current?.getBoundingClientRect()
    if (!caixa || window.innerWidth <= 600) return
    const faltaEspacoEmbaixo = caixa.bottom > window.innerHeight
    const cabeEmCima = caixa.top - caixa.height - 60 > 0
    setAbreParaCima(faltaEspacoEmbaixo && cabeEmCima)
  }, [])

  useEffect(() => {
    function tratarCliqueFora(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) aoFechar?.()
    }
    function tratarTeclado(e) {
      if (e.key === 'Escape') aoFechar?.()
    }
    document.addEventListener('mousedown', tratarCliqueFora)
    document.addEventListener('keydown', tratarTeclado)
    return () => {
      document.removeEventListener('mousedown', tratarCliqueFora)
      document.removeEventListener('keydown', tratarTeclado)
    }
  }, [aoFechar])

  const navegacao = {
    dias: {
      titulo: `${NOMES_DOS_MESES[mes]} de ${ano}`,
      rotuloDoTitulo: 'Escolher mês e ano',
      anterior: {
        rotulo: 'Mês anterior',
        data: new Date(ano, mes - 1, 1),
        fim: new Date(ano, mes, 0),
      },
      proximo: { rotulo: 'Próximo mês', data: new Date(ano, mes + 1, 1) },
      subir: 'meses',
    },
    meses: {
      titulo: String(ano),
      rotuloDoTitulo: 'Escolher ano',
      anterior: {
        rotulo: 'Ano anterior',
        data: new Date(ano - 1, mes, 1),
        fim: new Date(ano - 1, 11, 31),
      },
      proximo: { rotulo: 'Próximo ano', data: new Date(ano + 1, mes, 1) },
      subir: 'anos',
    },
    anos: {
      titulo: `${primeiroAnoDaPagina} – ${primeiroAnoDaPagina + ANOS_POR_PAGINA - 1}`,
      rotuloDoTitulo: null,
      anterior: {
        rotulo: 'Anos anteriores',
        data: new Date(ano - ANOS_POR_PAGINA, mes, 1),
        fim: new Date(primeiroAnoDaPagina - 1, 11, 31),
      },
      proximo: { rotulo: 'Próximos anos', data: new Date(ano + ANOS_POR_PAGINA, mes, 1) },
      subir: null,
    },
  }[visao]

  function selecionarData(data) {
    aoSelecionar?.(formatarParaInput(data))
    aoFechar?.()
  }

  function escolherMes(indice) {
    setDataVisualizada(new Date(ano, indice, 1))
    setVisao('dias')
  }

  function escolherAno(anoEscolhido) {
    setDataVisualizada(new Date(anoEscolhido, mes, 1))
    setVisao('meses')
  }

  return (
    <>
      <div className="calendario-backdrop" onClick={aoFechar} aria-hidden="true" />
      <div
        ref={containerRef}
        className={`calendario-popover${abreParaCima ? ' calendario-popover--acima' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Escolher data no calendário"
      >
        <header className="calendario__cabecalho">
          <button
            type="button"
            className="calendario__navegacao"
            aria-label={navegacao.anterior.rotulo}
            disabled={ehAnterior(navegacao.anterior.fim, dataLimite)}
            onClick={() => setDataVisualizada(navegacao.anterior.data)}
          >
            <Icone src={iconeVoltar} />
          </button>

          {navegacao.subir ? (
            <button
              type="button"
              className="calendario__titulo"
              aria-label={`${navegacao.titulo}. ${navegacao.rotuloDoTitulo}`}
              onClick={() => setVisao(navegacao.subir)}
            >
              {navegacao.titulo}
              <span className="calendario__titulo-seta" aria-hidden="true" />
            </button>
          ) : (
            <strong className="calendario__titulo calendario__titulo--fixo" aria-live="polite">
              {navegacao.titulo}
            </strong>
          )}

          <button
            type="button"
            className="calendario__navegacao"
            aria-label={navegacao.proximo.rotulo}
            onClick={() => setDataVisualizada(navegacao.proximo.data)}
          >
            <Icone src={iconeAvancar} />
          </button>
        </header>

        {visao === 'dias' && (
          <GradeDeDias
            ano={ano}
            mes={mes}
            hoje={hoje}
            dataSelecionada={dataSelecionada}
            dataLimite={dataLimite}
            aoEscolher={selecionarData}
          />
        )}

        {visao === 'meses' && (
          <div className="calendario__grade-larga" role="grid">
            {NOMES_DOS_MESES.map((nome, indice) => {
              const ultimoDia = new Date(ano, indice + 1, 0)
              return (
                <BotaoDaGrade
                  key={nome}
                  rotulo={nome.slice(0, 3)}
                  descricao={`${nome} de ${ano}`}
                  atual={ano === hoje.getFullYear() && indice === hoje.getMonth()}
                  selecionado={
                    dataSelecionada?.getFullYear() === ano && dataSelecionada?.getMonth() === indice
                  }
                  desabilitado={ehAnterior(ultimoDia, dataLimite)}
                  aoEscolher={() => escolherMes(indice)}
                />
              )
            })}
          </div>
        )}

        {visao === 'anos' && (
          <div className="calendario__grade-larga" role="grid">
            {Array.from({ length: ANOS_POR_PAGINA }, (_, i) => primeiroAnoDaPagina + i).map(
              (anoDaGrade) => (
                <BotaoDaGrade
                  key={anoDaGrade}
                  rotulo={anoDaGrade}
                  descricao={String(anoDaGrade)}
                  atual={anoDaGrade === hoje.getFullYear()}
                  selecionado={dataSelecionada?.getFullYear() === anoDaGrade}
                  desabilitado={ehAnterior(new Date(anoDaGrade, 11, 31), dataLimite)}
                  aoEscolher={() => escolherAno(anoDaGrade)}
                />
              ),
            )}
          </div>
        )}

        <footer className="calendario__rodape">
          <button
            type="button"
            className="calendario__botao-hoje"
            onClick={() => selecionarData(hoje)}
          >
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

function GradeDeDias({ ano, mes, hoje, dataSelecionada, dataLimite, aoEscolher }) {
  return (
    <>
      <div className="calendario__dias-semana" aria-hidden="true">
        {DIAS_DA_SEMANA.map((diaSemana) => (
          <span key={diaSemana} className="calendario__dia-semana">
            {diaSemana}
          </span>
        ))}
      </div>

      <div className="calendario__grade" role="grid">
        {gerarGradeDoMes(ano, mes).map((diaObj) => {
          const desabilitado = ehAnterior(diaObj.data, dataLimite)
          const selecionado = saoMesmoDia(diaObj.data, dataSelecionada)

          let classes = 'calendario__dia'
          if (!diaObj.eDoMesAtual) classes += ' calendario__dia--outro-mes'
          if (saoMesmoDia(diaObj.data, hoje)) classes += ' calendario__dia--hoje'
          if (selecionado) classes += ' calendario__dia--selecionado'
          if (desabilitado) classes += ' calendario__dia--desabilitado'

          return (
            <button
              key={diaObj.chave}
              type="button"
              className={classes}
              disabled={desabilitado}
              aria-label={`${diaObj.dia} de ${NOMES_DOS_MESES[diaObj.mes]} de ${diaObj.ano}`}
              aria-selected={selecionado}
              onClick={() => aoEscolher(diaObj.data)}
            >
              {diaObj.dia}
            </button>
          )
        })}
      </div>
    </>
  )
}

function BotaoDaGrade({ rotulo, descricao, atual, selecionado, desabilitado, aoEscolher }) {
  let classes = 'calendario__opcao'
  if (atual) classes += ' calendario__opcao--atual'
  if (selecionado) classes += ' calendario__opcao--selecionada'

  return (
    <button
      type="button"
      className={classes}
      disabled={desabilitado}
      aria-label={descricao}
      aria-selected={selecionado}
      onClick={aoEscolher}
    >
      {rotulo}
    </button>
  )
}
