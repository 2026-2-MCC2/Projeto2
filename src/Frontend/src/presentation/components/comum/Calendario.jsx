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
import { useFocoPreso } from '../../hooks/useFocoPreso.js'
import { Icone } from './Icone.jsx'
import iconeVoltar from '../../assets/organizador/icone-voltar.svg'
import iconeAvancar from '../../assets/organizador/icone-avancar.svg'

const ANOS_POR_PAGINA = 12
const DIAS_POR_SETA = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }

// teclas da grade de dias (padrão de date picker da WAI-ARIA); Shift+PageUp/PageDown pula um ano
function diaDestinoDaTecla({ key, shiftKey }, dia) {
  const [ano, mes, numero] = [dia.getFullYear(), dia.getMonth(), dia.getDate()]
  if (key in DIAS_POR_SETA) return new Date(ano, mes, numero + DIAS_POR_SETA[key])
  if (key === 'Home') return new Date(ano, mes, numero - dia.getDay())
  if (key === 'End') return new Date(ano, mes, numero + 6 - dia.getDay())
  if (key === 'PageUp' || key === 'PageDown') {
    const meses = (key === 'PageUp' ? -1 : 1) * (shiftKey ? 12 : 1)
    const ultimoDiaDoMes = new Date(ano, mes + meses + 1, 0).getDate()
    return new Date(ano, mes + meses, Math.min(numero, ultimoDiaDoMes))
  }
  return null
}

// clicar no título sobe de nível: dias → meses → anos; escolher um mês ou ano desce de volta
export function Calendario({ valor, aoSelecionar, aoFechar, semPassado = false, periodo = null }) {
  const containerRef = useFocoPreso()
  const dataSelecionada = paraDataLocal(valor)
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const dataLimite = semPassado ? hoje : null

  const outraPonta = paraDataLocal(periodo?.outraPonta)

  // campo vazio abre no mês da outra ponta do período (o término abre no mês do início)
  const [dataVisualizada, setDataVisualizada] = useState(
    () => new Date(dataSelecionada ?? outraPonta ?? hoje),
  )
  const [visao, setVisao] = useState('dias')
  const [abreParaCima, setAbreParaCima] = useState(false)
  const [diaEmFoco, setDiaEmFoco] = useState(null)
  // ao abrir, ao trocar de visão e ao navegar pelo teclado, o foco vai para o item marcado
  const focoPendente = useRef(true)

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
  }, [containerRef])

  useEffect(() => {
    if (!focoPendente.current) return
    focoPendente.current = false
    containerRef.current?.querySelector('[data-foco-inicial]')?.focus()
  })

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
  }, [aoFechar, containerRef])

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

  function mudarVisao(novaVisao) {
    focoPendente.current = true
    setVisao(novaVisao)
  }

  function navegarPelosDias(evento, dia) {
    const destino = diaDestinoDaTecla(evento, dia)
    if (!destino) return
    evento.preventDefault()

    const alvo = ehAnterior(destino, dataLimite)
      ? new Date(dataLimite.getFullYear(), dataLimite.getMonth(), dataLimite.getDate())
      : destino
    focoPendente.current = true
    setDiaEmFoco(alvo)
    setDataVisualizada(new Date(alvo.getFullYear(), alvo.getMonth(), 1))
  }

  // o Esc para aqui para não fechar também o modal em volta
  function tratarEsc(evento) {
    if (evento.key !== 'Escape') return
    evento.stopPropagation()
    aoFechar?.()
  }

  function selecionarData(data) {
    aoSelecionar?.(formatarParaInput(data))
    aoFechar?.()
  }

  function escolherMes(indice) {
    setDataVisualizada(new Date(ano, indice, 1))
    mudarVisao('dias')
  }

  function escolherAno(anoEscolhido) {
    setDataVisualizada(new Date(anoEscolhido, mes, 1))
    mudarVisao('meses')
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
        onKeyDown={tratarEsc}
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
              onClick={() => mudarVisao(navegacao.subir)}
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
            diaEmFoco={diaEmFoco}
            ponta={periodo?.ponta}
            outraPonta={outraPonta}
            dataLimite={dataLimite}
            aoEscolher={selecionarData}
            aoNavegar={navegarPelosDias}
          />
        )}

        {visao === 'meses' && (
          <GradeDeOpcoes
            opcoes={NOMES_DOS_MESES.map((nome, indice) => ({
              chave: nome,
              rotulo: nome.slice(0, 3),
              descricao: `${nome} de ${ano}`,
              atual: ano === hoje.getFullYear() && indice === hoje.getMonth(),
              selecionado:
                dataSelecionada?.getFullYear() === ano && dataSelecionada?.getMonth() === indice,
              desabilitado: ehAnterior(new Date(ano, indice + 1, 0), dataLimite),
              aoEscolher: () => escolherMes(indice),
            }))}
          />
        )}

        {visao === 'anos' && (
          <GradeDeOpcoes
            opcoes={Array.from({ length: ANOS_POR_PAGINA }, (_, i) => {
              const anoDaGrade = primeiroAnoDaPagina + i
              return {
                chave: anoDaGrade,
                rotulo: anoDaGrade,
                descricao: String(anoDaGrade),
                atual: anoDaGrade === hoje.getFullYear(),
                selecionado: dataSelecionada?.getFullYear() === anoDaGrade,
                desabilitado: ehAnterior(new Date(anoDaGrade, 11, 31), dataLimite),
                aoEscolher: () => escolherAno(anoDaGrade),
              }
            })}
          />
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

// [início, fim] do período; com o mouse sobre um dia, ele ocupa a ponta deste campo
function limitesDoPeriodo(ponta, outraPonta, pontaDesteCampo) {
  if (!ponta || !outraPonta || !pontaDesteCampo) return null
  const [inicio, fim] =
    ponta === 'inicio' ? [pontaDesteCampo, outraPonta] : [outraPonta, pontaDesteCampo]
  return inicio < fim ? { inicio, fim } : null
}

function semanasDoMes(ano, mes) {
  const dias = gerarGradeDoMes(ano, mes)
  return Array.from({ length: dias.length / 7 }, (_, i) => dias.slice(i * 7, i * 7 + 7))
}

// só um dia entra no Tab: o do teclado, o escolhido, hoje ou o primeiro disponível do mês
function diaFocavelDoMes(semanas, candidatos, dataLimite) {
  const disponiveis = semanas
    .flat()
    .filter((dia) => dia.eDoMesAtual && !ehAnterior(dia.data, dataLimite))
  for (const candidato of candidatos) {
    const dia = disponiveis.find((d) => saoMesmoDia(d.data, candidato))
    if (dia) return dia.data
  }
  return disponiveis[0]?.data ?? null
}

function GradeDeDias({
  ano,
  mes,
  hoje,
  dataSelecionada,
  diaEmFoco,
  ponta,
  outraPonta,
  dataLimite,
  aoEscolher,
  aoNavegar,
}) {
  const [diaSobOMouse, setDiaSobOMouse] = useState(null)
  const intervalo = limitesDoPeriodo(ponta, outraPonta, diaSobOMouse ?? dataSelecionada)
  const semanas = semanasDoMes(ano, mes)
  const diaFocavel = diaFocavelDoMes(semanas, [diaEmFoco, dataSelecionada, hoje], dataLimite)

  return (
    <>
      <div className="calendario__dias-semana" aria-hidden="true">
        {DIAS_DA_SEMANA.map((diaSemana) => (
          <span key={diaSemana} className="calendario__dia-semana">
            {diaSemana}
          </span>
        ))}
      </div>

      <div
        className="calendario__grade"
        role="grid"
        aria-label={`${NOMES_DOS_MESES[mes]} de ${ano}`}
      >
        {semanas.map((semana) => (
          <div key={semana[0].chave} className="calendario__semana" role="row">
            {semana.map((diaObj) => {
              const desabilitado = ehAnterior(diaObj.data, dataLimite)
              const selecionado = saoMesmoDia(diaObj.data, dataSelecionada)
              const ehHoje = saoMesmoDia(diaObj.data, hoje)
              const focavel = saoMesmoDia(diaObj.data, diaFocavel)

              let classes = 'calendario__dia'
              if (!diaObj.eDoMesAtual) classes += ' calendario__dia--outro-mes'
              if (ehHoje) classes += ' calendario__dia--hoje'
              if (selecionado) classes += ' calendario__dia--selecionado'
              if (desabilitado) classes += ' calendario__dia--desabilitado'
              if (saoMesmoDia(diaObj.data, outraPonta)) classes += ' calendario__dia--outra-ponta'
              if (intervalo && diaObj.data > intervalo.inicio && diaObj.data < intervalo.fim) {
                classes += ' calendario__dia--no-periodo'
              }

              return (
                <button
                  key={diaObj.chave}
                  type="button"
                  role="gridcell"
                  className={classes}
                  disabled={desabilitado}
                  tabIndex={focavel ? 0 : -1}
                  data-foco-inicial={focavel || undefined}
                  aria-label={`${diaObj.dia} de ${NOMES_DOS_MESES[diaObj.mes]} de ${diaObj.ano}`}
                  aria-selected={selecionado}
                  aria-current={ehHoje ? 'date' : undefined}
                  onClick={() => aoEscolher(diaObj.data)}
                  onKeyDown={(evento) => aoNavegar(evento, diaObj.data)}
                  onMouseEnter={() => !desabilitado && setDiaSobOMouse(diaObj.data)}
                  onMouseLeave={() => setDiaSobOMouse(null)}
                >
                  {diaObj.dia}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </>
  )
}

function indiceDoFocoInicial(opcoes) {
  const habilitadas = opcoes.filter((opcao) => !opcao.desabilitado)
  const inicial =
    habilitadas.find((opcao) => opcao.selecionado) ??
    habilitadas.find((opcao) => opcao.atual) ??
    habilitadas[0]
  return opcoes.indexOf(inicial)
}

// meses e anos são uma lista simples de botões, percorrida com o Tab, sem papel de grade
function GradeDeOpcoes({ opcoes }) {
  const indiceInicial = indiceDoFocoInicial(opcoes)

  return (
    <div className="calendario__grade-larga">
      {opcoes.map((opcao, indice) => {
        let classes = 'calendario__opcao'
        if (opcao.atual) classes += ' calendario__opcao--atual'
        if (opcao.selecionado) classes += ' calendario__opcao--selecionada'

        return (
          <button
            key={opcao.chave}
            type="button"
            className={classes}
            disabled={opcao.desabilitado}
            data-foco-inicial={indice === indiceInicial || undefined}
            aria-label={opcao.descricao}
            aria-pressed={opcao.selecionado}
            onClick={opcao.aoEscolher}
          >
            {opcao.rotulo}
          </button>
        )
      })}
    </div>
  )
}
