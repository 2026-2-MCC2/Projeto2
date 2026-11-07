import { api } from '../infrastructure/api.js'
import { paraData, paraNumero, paraPercentual } from '../domain/validacao.js'
import { digitos, formatarMoeda, mascararCep } from '../domain/formatacao.js'
import {
  buscarEventoEmMemoria,
  guardarEventos,
  iniciarPedido,
  limparEventosEmMemoria,
} from './eventosEmMemoria.js'
import { ingressosParaEquilibrio, precoEmCentavos, resultadoDoCenario } from '../domain/ticket.js'

const CENARIOS_MAPA = {
  minimo: 'minimum',
  esperado: 'expected',
  maximo: 'maximum',
  minimum: 'minimum',
  expected: 'expected',
  maximum: 'maximum',
}

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export const STATUS_FRONTEND = {
  planejamento: { nome: 'Em planejamento', nomeCurto: 'Planejamento' },
  cotacao: { nome: 'Em cotação', nomeCurto: 'Cotação' },
  aprovado: { nome: 'Aprovado', nomeCurto: 'Aprovado' },
  cancelado: { nome: 'Cancelado', nomeCurto: 'Cancelado' },
}

const STATUS_DO_FRONT_POR_STATUS_DO_BACKEND = {
  draft: 'planejamento',
  open_for_quotes: 'cotacao',
  closed: 'aprovado',
  canceled: 'cancelado',
}

// a API diz se o evento ainda aceita edição, para a regra dos status finais ficar só no backend
export const eventoPodeSerEditado = (evento) => evento?.raw?.is_editable ?? false

function mapearStatusBackend(statusBackend) {
  return STATUS_DO_FRONT_POR_STATUS_DO_BACKEND[statusBackend] ?? 'planejamento'
}

const quantidadeDePessoas = (quantidade) =>
  `${quantidade.toLocaleString('pt-BR')} ${quantidade === 1 ? 'pessoa' : 'pessoas'}`

export { formatarMoeda }

// a margem é guardada com 4 casas da fração: 0,125 aparece como 12,5%, não arredondada para 13%
const formatarMargem = (fracao) =>
  `${(Number(fracao) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`

// as datas são criadas no horário de quem cadastra, então são mostradas no horário local também
function partesDaData(dataIso) {
  const data = new Date(dataIso)
  return { dia: data.getDate(), mes: MESES[data.getMonth()], ano: data.getFullYear() }
}

export function formatarPeriodo(dataInicioIso, dataTerminoIso) {
  if (!dataInicioIso) return 'A definir'
  const inicio = partesDaData(dataInicioIso)
  const termino = partesDaData(dataTerminoIso ?? dataInicioIso)

  if (inicio.ano === termino.ano && inicio.mes === termino.mes) {
    return inicio.dia === termino.dia
      ? `${inicio.dia} ${inicio.mes} ${inicio.ano}`
      : `${inicio.dia}–${termino.dia} ${inicio.mes} ${inicio.ano}`
  }

  return `${inicio.dia} ${inicio.mes} a ${termino.dia} ${termino.mes} ${termino.ano}`
}

export function formatarDia(dataIso) {
  const { dia, mes, ano } = partesDaData(dataIso)
  return `${dia} ${mes} ${ano}`
}

export function formatarHorario(dataIso) {
  return new Date(dataIso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function formatarDataEHora(dataIso) {
  return `${formatarDia(dataIso)}, ${formatarHorario(dataIso)}`
}

function formatarPeriodoCurto(dataInicioIso, dataTerminoIso) {
  if (!dataInicioIso) return ''
  const inicio = partesDaData(dataInicioIso)
  const termino = partesDaData(dataTerminoIso ?? dataInicioIso)

  if (inicio.ano !== termino.ano) {
    return `${inicio.dia} ${inicio.mes} ${inicio.ano}–${termino.dia} ${termino.mes} ${termino.ano}`
  }
  if (inicio.mes !== termino.mes) return `${inicio.dia} ${inicio.mes}–${termino.dia} ${termino.mes}`
  return inicio.dia === termino.dia
    ? `${inicio.dia} ${inicio.mes}`
    : `${inicio.dia}–${termino.dia} ${inicio.mes}`
}

function situacaoDoOrcamento(totalCustos, tetoDeGastos) {
  const teto = Number(tetoDeGastos) || null
  if (!teto) return { consolidado: formatarMoeda(totalCustos), teto: null }

  const saldo = teto - totalCustos
  return {
    consolidado: formatarMoeda(totalCustos),
    teto: formatarMoeda(teto),
    saldo: formatarMoeda(Math.abs(saldo)),
    acimaDoTeto: saldo < 0,
    comprometido: Math.round((totalCustos / teto) * 100),
  }
}

function calcularDadosTicket(evento, totalCustos) {
  const publicoMin = Number(evento.min_audience) || 1
  const publicoExp = Number(evento.expected_audience) || publicoMin
  const publicoMax = Number(evento.max_audience) || publicoExp
  const margem = Number(evento.profit_margin) || 0

  const cenarioRef = evento.reference_scenario || 'expected'
  const publicoRef =
    cenarioRef === 'minimum' ? publicoMin : cenarioRef === 'maximum' ? publicoMax : publicoExp
  const margemInvalida = margem >= 1

  const ticketPara = (publico) =>
    margem < 1 && totalCustos > 0 ? totalCustos / (publico * (1 - margem)) : 0
  // ticket de equilíbrio: o preço que só paga o custo, com margem zero
  const equilibrioPara = (publico) =>
    totalCustos > 0 ? `equilíbrio ${formatarMoeda(totalCustos / publico)}` : null

  const precoSugeridoNum = ticketPara(publicoRef)
  const precoSugerido = precoSugeridoNum > 0 ? formatarMoeda(precoSugeridoNum) : 'A calcular'

  const ticketMinNum = ticketPara(publicoMin)
  const ticketExpNum = ticketPara(publicoExp)
  const ticketMaxNum = ticketPara(publicoMax)

  const ticketEstimado = {
    cenario:
      cenarioRef === 'minimum'
        ? 'Cenário mínimo'
        : cenarioRef === 'maximum'
          ? 'Cenário máximo'
          : 'Cenário esperado',
    valor: precoSugerido,
    explicacao: margemInvalida
      ? 'A margem de lucro precisa ser menor que 100% para calcular o ticket.'
      : totalCustos > 0
        ? `Custo de ${formatarMoeda(totalCustos)} dividido por ${quantidadeDePessoas(publicoRef)}, com margem de ${formatarMargem(margem)}.`
        : 'Cadastre os custos para calcular o ticket sugerido.',
    cenarios: [
      {
        nome: 'Pessimista',
        valor: ticketMinNum > 0 ? formatarMoeda(ticketMinNum) : '—',
        equilibrio: equilibrioPara(publicoMin),
        publico: `${quantidadeDePessoas(publicoMin)}`,
        destaque: cenarioRef === 'minimum',
      },
      {
        nome: 'Esperado',
        valor: ticketExpNum > 0 ? formatarMoeda(ticketExpNum) : '—',
        equilibrio: equilibrioPara(publicoExp),
        publico: `${quantidadeDePessoas(publicoExp)}`,
        destaque: cenarioRef === 'expected',
      },
      {
        nome: 'Otimista',
        valor: ticketMaxNum > 0 ? formatarMoeda(ticketMaxNum) : '—',
        equilibrio: equilibrioPara(publicoMax),
        publico: `${quantidadeDePessoas(publicoMax)}`,
        destaque: cenarioRef === 'maximum',
      },
    ],
  }

  const precoCobrado = precoEmCentavos(precoSugeridoNum)
  if (totalCustos <= 0 || precoCobrado <= 0) {
    return { precoSugerido, ticketEstimado, calculo: null }
  }

  const ingressosEquilibrio = ingressosParaEquilibrio(totalCustos, precoCobrado)
  const receitaMin = publicoMin * precoCobrado
  const resultadoMin = resultadoDoCenario(publicoMin, precoCobrado, totalCustos)

  const receitaExp = publicoExp * precoCobrado
  const resultadoExp = resultadoDoCenario(publicoExp, precoCobrado, totalCustos)

  const receitaMax = publicoMax * precoCobrado
  const resultadoMax = resultadoDoCenario(publicoMax, precoCobrado, totalCustos)

  const resultadoDoCenarioBase =
    cenarioRef === 'minimum' ? resultadoMin : cenarioRef === 'maximum' ? resultadoMax : resultadoExp
  const etiquetaDoCenario = (cenario) => (cenarioRef === cenario ? 'cenário base' : undefined)

  const formatarResultado = (val) => {
    const prefixo = val >= 0 ? '+ ' : '− '
    return `${prefixo}${formatarMoeda(Math.abs(val))}`
  }

  const calculo = {
    precoSugerido,
    apoioDosCenarios: `Mantendo o preço simulado de ${precoSugerido}.`,
    cenarios: [
      {
        nome: 'Pessimista',
        etiqueta: etiquetaDoCenario('minimum'),
        publico: `${quantidadeDePessoas(publicoMin)}`,
        resultado: formatarResultado(resultadoMin),
        resultadoSemSinal: formatarMoeda(Math.abs(resultadoMin)),
        positivo: resultadoMin >= 0,
        receita: formatarMoeda(receitaMin),
        base: cenarioRef === 'minimum',
      },
      {
        nome: 'Realista',
        etiqueta: etiquetaDoCenario('expected'),
        publico: `${quantidadeDePessoas(publicoExp)}`,
        resultado: formatarResultado(resultadoExp),
        resultadoSemSinal: formatarMoeda(Math.abs(resultadoExp)),
        positivo: resultadoExp >= 0,
        receita: formatarMoeda(receitaExp),
        base: cenarioRef === 'expected',
      },
      {
        nome: 'Otimista',
        etiqueta: etiquetaDoCenario('maximum'),
        publico: `${quantidadeDePessoas(publicoMax)}`,
        resultado: formatarResultado(resultadoMax),
        resultadoSemSinal: formatarMoeda(Math.abs(resultadoMax)),
        positivo: resultadoMax >= 0,
        receita: formatarMoeda(receitaMax),
        base: cenarioRef === 'maximum',
      },
    ],
    equilibrio: {
      ingressos: `${ingressosEquilibrio.toLocaleString('pt-BR')} ingressos`,
      explicacao: `Ao preço de ${precoSugerido}, a receita cobre o custo total na venda de ${ingressosEquilibrio.toLocaleString('pt-BR')} ingressos. Acima disso, o evento gera lucro.`,
      custoTotal: formatarMoeda(totalCustos),
      ingressosNoEquilibrio: ingressosEquilibrio,
      publicoMaximo: publicoMax,
    },
    resultado: [
      { rotulo: 'Custo total', valor: formatarMoeda(totalCustos) },
      { rotulo: 'Ticket de equilíbrio', valor: formatarMoeda(totalCustos / publicoRef) },
      {
        rotulo: 'Ponto de equilíbrio',
        valor: `${ingressosEquilibrio.toLocaleString('pt-BR')} ingressos`,
      },
      {
        rotulo: 'Margem no cenário base',
        valor: `${formatarMoeda(resultadoDoCenarioBase)} · ${formatarMargem(margem)}`,
        positivo: resultadoDoCenarioBase >= 0,
      },
    ],
    formula: 'Ticket = Custo total ÷ [Público × (1 − Margem)]',
    premissas: [
      { rotulo: 'Custo consolidado', valor: formatarMoeda(totalCustos) },
      { rotulo: 'Margem de lucro', valor: formatarMargem(margem) },
      { rotulo: 'Público mínimo', valor: publicoMin.toLocaleString('pt-BR') },
      { rotulo: 'Público esperado', valor: publicoExp.toLocaleString('pt-BR') },
      { rotulo: 'Público máximo', valor: publicoMax.toLocaleString('pt-BR') },
      { rotulo: 'Arredondamento', valor: 'Em centavos' },
    ],
  }

  return { precoSugerido, ticketEstimado, calculo }
}

function calcularAndamento(statusBackend, internalCostsCount) {
  const isQuotes = statusBackend === 'open_for_quotes'
  const isClosed = statusBackend === 'closed'

  // cancelado encerra o planejamento onde ele estava
  if (statusBackend === 'canceled') {
    return [
      { nome: 'Evento cadastrado', situacao: 'concluida' },
      { nome: 'Evento cancelado', situacao: 'atual' },
    ]
  }

  return [
    { nome: 'Evento cadastrado', situacao: 'concluida' },
    {
      nome: 'Itens de custo definidos',
      // depois de publicado, a fase de itens ficou para trás mesmo sem custo próprio
      situacao: internalCostsCount > 0 || isQuotes || isClosed ? 'concluida' : 'atual',
    },
    {
      nome: 'Cotação com fornecedores',
      situacao: isClosed ? 'concluida' : isQuotes ? 'atual' : 'futura',
    },
    {
      nome: 'Orçamento consolidado',
      situacao: isClosed ? 'concluida' : 'futura',
    },
    {
      nome: 'Ticket aprovado',
      situacao: isClosed ? 'concluida' : 'futura',
    },
  ]
}

function formatarEventoParaExibicao(evento, itensDeCotacao = evento.budget_items ?? []) {
  if (!evento) return null

  const statusFront = mapearStatusBackend(evento.status)
  const periodo = formatarPeriodo(evento.start_date, evento.end_date)
  const periodoCurto = formatarPeriodoCurto(evento.start_date, evento.end_date)
  const local = `${evento.venue_name}, ${evento.state}`
  const publico = `${quantidadeDePessoas(Number(evento.expected_audience || 0))}`

  const totalCustos = Number(evento.total_cost ?? evento.total_internal_cost) || 0
  const totalPropostasAceitas = Number(evento.total_accepted_proposals) || 0
  const totalCustosProprios = Number(evento.total_internal_cost) || 0
  const { precoSugerido, ticketEstimado, calculo } = calcularDadosTicket(evento, totalCustos)
  const motivoCancelamento = evento.cancellation_reason ?? evento.motivoDoCancelamento ?? null

  const dadosExibicao = [
    { rotulo: 'PERÍODO', valor: periodo },
    { rotulo: 'LOCAL', valor: `${evento.venue_name}, ${evento.city} — ${evento.state}` },
    {
      rotulo: 'PÚBLICO',
      valor: `${Number(evento.min_audience).toLocaleString('pt-BR')} · ${Number(evento.expected_audience).toLocaleString('pt-BR')} · ${Number(evento.max_audience).toLocaleString('pt-BR')}`,
    },
    { rotulo: 'MARGEM DE LUCRO', valor: formatarMargem(evento.profit_margin) },
    { rotulo: 'TIPO DE INGRESSO', valor: 'Inteira' },
    ...(statusFront === 'cancelado' || motivoCancelamento
      ? [{ rotulo: 'MOTIVO DO CANCELAMENTO', valor: motivoCancelamento || 'Não informado' }]
      : []),
  ]

  const linhasCustos = (evento.internal_costs || []).map((custo) => ({
    chave: custo.internal_cost_key,
    tipo: custo.type,
    valorNumero: custo.amount,
    nome: custo.description,
    categoria: NOME_DO_TIPO_DE_CUSTO[custo.type] ?? 'Outros',
    origem: 'Custo próprio',
    valor: formatarMoeda(custo.amount),
  }))

  const itensProprios = (evento.internal_costs || []).map((custo) => ({
    chave: custo.internal_cost_key,
    nome: custo.description,
    categoria: NOME_DO_TIPO_DE_CUSTO[custo.type] ?? 'Outros',
    situacao: 'custoProprio',
    valor: formatarMoeda(custo.amount),
  }))
  const itensDeFornecedores = itensDeCotacao.map((item) => ({
    chave: item.item_key,
    nome: item.description,
    categoria: item.category,
    situacao: item.accepted_proposal ? 'aceita' : 'cotacao',
    valor:
      item.accepted_proposal || item.estimated_value != null
        ? formatarMoeda(item.accepted_proposal?.amount ?? item.estimated_value)
        : 'A definir',
    propostasCount: Number(item.proposals_count) || 0,
  }))
  const itens = [...itensDeFornecedores, ...itensProprios]

  const andamento = calcularAndamento(evento.status, (evento.internal_costs || []).length)

  const formatado = {
    id: evento.event_key,
    event_key: evento.event_key,
    nome: evento.name,
    category: evento.category,
    status: statusFront,
    statusReal: evento.status,
    motivoDoCancelamento: evento.cancellation_reason,
    periodo,
    periodoCurto,
    local,
    cidade: evento.city,
    publico,
    ticket: precoSugerido,
    raw: evento,
    detalhe: {
      nomeCompleto: evento.name,
      resumo: `${periodo}  ·  ${evento.venue_name}, ${evento.city}  ·  ${publico} ${Number(evento.expected_audience) === 1 ? 'esperada' : 'esperadas'}`,
      resumoMobile: `${periodo} · ${STATUS_FRONTEND[statusFront]?.nome ?? 'Em planejamento'}`,
      dados: dadosExibicao,
      orcamento: situacaoDoOrcamento(totalCustos, evento.budget_limit),
      itens,
      totalDeItens: itens.length,
      propostasRecebidas: itensDeFornecedores.filter((item) => item.propostasCount > 0),
      ticketEstimado,
      calculo,
      andamento,
      custos: {
        totalProprios: formatarMoeda(totalCustosProprios),
        resumoMobile: `${linhasCustos.length} custos cadastrados`,
        indicadores: [
          { nome: 'Custos de fornecedores', valor: formatarMoeda(totalPropostasAceitas) },
          {
            nome: 'Custos fiscais e operacionais',
            valor: formatarMoeda(totalCustosProprios),
          },
          { nome: 'Custo total do evento', valor: formatarMoeda(totalCustos) },
        ],
        linhas: linhasCustos,
      },
    },
  }

  return formatado
}

// o horário é opcional: sem ele o evento ocupa o dia inteiro, e a edição mostra o campo vazio de novo
const ABERTURA_SEM_HORARIO = '00:00'
const ENCERRAMENTO_SEM_HORARIO = '23:59'

const ehHorario = (texto) => /^([01]\d|2[0-3]):[0-5]\d$/.test(texto ?? '')

// data inválida nunca vira "hoje": a tela mostra o erro e a pessoa corrige
function juntarDataEHorario(dataTexto, horarioTexto, horarioSemPreencher) {
  const data = paraData(dataTexto ?? '')
  if (!data) throw new Error('Confira as datas do evento: uma delas não existe no calendário.')

  const horario = ehHorario(horarioTexto) ? horarioTexto : horarioSemPreencher
  const [horas, minutos] = horario.split(':').map(Number)
  data.setHours(horas, minutos, 0, 0)
  return data
}

// encerramento antes da abertura no mesmo dia é um evento que passa da meia-noite
export function passaDaMeiaNoite({
  dataInicio,
  dataTermino,
  horarioAbertura,
  horarioEncerramento,
}) {
  const horariosValidos = ehHorario(horarioAbertura) && ehHorario(horarioEncerramento)
  return horariosValidos && dataInicio === dataTermino && horarioEncerramento < horarioAbertura
}

function periodoDoEvento(dados) {
  const inicio = juntarDataEHorario(dados.dataInicio, dados.horarioAbertura, ABERTURA_SEM_HORARIO)
  const termino = juntarDataEHorario(
    dados.dataTermino,
    dados.horarioEncerramento,
    ENCERRAMENTO_SEM_HORARIO,
  )
  if (passaDaMeiaNoite(dados)) termino.setDate(termino.getDate() + 1)
  return { startDate: inicio.toISOString(), endDate: termino.toISOString() }
}

function parametrosDoTicket(dados) {
  const minAudience = Math.round(paraNumero(dados.publicoMinimo)) || 1
  const expectedAudience = Math.round(paraNumero(dados.publicoEsperado)) || minAudience
  const maxAudience = Math.round(paraNumero(dados.publicoMaximo)) || expectedAudience

  const margemNumero = paraPercentual(dados.margemLucro)
  const profitMargin = Number.isNaN(margemNumero)
    ? 0.2
    : Math.min(Math.max(Number((margemNumero / 100).toFixed(4)), 0), 0.9999)

  return {
    min_audience: minAudience,
    expected_audience: expectedAudience,
    max_audience: maxAudience,
    profit_margin: profitMargin,
    reference_scenario: CENARIOS_MAPA[dados.cenarioReferencia] || 'expected',
  }
}

export const NOME_DO_TIPO_DE_CUSTO = {
  tax: 'Fiscal',
  operational: 'Operacional',
  variable: 'Variável',
  other: 'Outros',
}

const CUSTOS_PROPRIOS_DO_FORMULARIO = [
  { campo: 'custosFiscais', type: 'tax', description: 'Custos fiscais e alvarás' },
  { campo: 'equipeProducao', type: 'operational', description: 'Equipe de produção' },
  { campo: 'outrosCustos', type: 'other', description: 'Outros custos variáveis' },
]

function custosProprios(dados) {
  return CUSTOS_PROPRIOS_DO_FORMULARIO.map(({ campo, type, description }) => ({
    type,
    description,
    amount: paraNumero(dados[campo] ?? ''),
  })).filter((custo) => custo.amount > 0)
}

function montarPayloadEvento(dados) {
  const { startDate, endDate } = periodoDoEvento(dados)

  const teto = paraNumero(dados.tetoDeGastos ?? '')
  const budgetLimit = teto > 0 ? Number(teto.toFixed(2)) : null

  const venueCapacity = dados.capacidadeEspaco
    ? Math.round(paraNumero(dados.capacidadeEspaco))
    : null

  return {
    name: dados.nome.trim(),
    category: dados.categoria.trim(),
    description: dados.descricao?.trim() || null,
    start_date: startDate,
    end_date: endDate,
    venue_name: dados.nomeEspaco.trim(),
    address: dados.endereco.trim(),
    city: dados.cidade.trim(),
    state: (dados.estado || 'SP').toUpperCase().trim(),
    zip_code: dados.cep ? digitos(dados.cep) : null,
    venue_capacity: venueCapacity || null,
    ...parametrosDoTicket(dados),
    budget_limit: budgetLimit,
    internal_costs: custosProprios(dados),
  }
}

// na edição, o custo já cadastrado no evento entra junto com os custos próprios digitados
export function previaDoTicket(dados, custoJaCadastrado = 0) {
  const custoDoFormulario = custosProprios(dados).reduce((total, custo) => total + custo.amount, 0)
  const custoTotal = (Number(custoJaCadastrado) || 0) + custoDoFormulario
  return calcularDadosTicket(parametrosDoTicket(dados), custoTotal).ticketEstimado
}

// máximo aceito pelo backend
const EVENTOS_POR_PAGINA = 100

const montarBuscaDeEventos = ({ limit, page }) => `/events?limit=${limit}&page=${page}`

function formatarEGuardar(eventosDaApi, pedido) {
  const eventos = eventosDaApi.map((evento) => {
    const itensEmMemoria = buscarEventoEmMemoria(evento.event_key)?.raw?.budget_items
    return formatarEventoParaExibicao(evento, evento.budget_items ?? itensEmMemoria ?? [])
  })
  guardarEventos(eventos, pedido)
  return eventos
}

// a listagem não traz os itens nem o total aceito: sem detalhe em memória, o evento fica parcial
function formatarEGuardarDaLista(eventosDaLista, pedido) {
  const eventos = eventosDaLista.map((eventoDaLista) => {
    const detalhado = buscarEventoEmMemoria(eventoDaLista.event_key)
    if (!detalhado || detalhado.parcial) {
      return { ...formatarEventoParaExibicao(eventoDaLista, []), parcial: true }
    }

    const totalAceitas = Number(detalhado.raw.total_accepted_proposals) || 0
    const completo = {
      ...eventoDaLista,
      total_accepted_proposals: totalAceitas,
      total_cost: (Number(eventoDaLista.total_internal_cost) || 0) + totalAceitas,
    }
    return formatarEventoParaExibicao(completo, detalhado.raw.budget_items ?? [])
  })
  guardarEventos(eventos, pedido)
  return eventos
}

// o menu aparece em toda tela do organizador: a lista é buscada uma vez e refeita quando um evento muda
let recentesEmCache = null

function esquecerRecentes() {
  recentesEmCache = null
}

// ao sair, nada do organizador anterior pode aparecer para quem entrar na mesma aba
export function esquecerEventosDaSessao() {
  esquecerRecentes()
  carregamentosEmAndamento.clear()
  ultimaBuscaPorChave.clear()
  limparEventosEmMemoria()
}

export function listarEventosRecentes(quantidade) {
  if (recentesEmCache?.quantidade !== quantidade) {
    const pedido = iniciarPedido()
    const carregamento = api
      .get(montarBuscaDeEventos({ limit: quantidade, page: 0 }))
      .then((resposta) => formatarEGuardarDaLista(resposta.data, pedido))
      .catch((falha) => {
        // só esquece se este ainda for o pedido guardado; um mais novo pode ter tomado o lugar
        if (recentesEmCache?.carregamento === carregamento) esquecerRecentes()
        throw falha
      })
    recentesEmCache = { quantidade, carregamento }
  }
  return recentesEmCache.carregamento
}

export async function listarTodosOsEventos() {
  const buscarPagina = (page) => api.get(montarBuscaDeEventos({ limit: EVENTOS_POR_PAGINA, page }))

  const pedido = iniciarPedido()
  const primeira = await buscarPagina(0)
  const totalDePaginas = Math.ceil(primeira.total / EVENTOS_POR_PAGINA)
  const demais = await Promise.all(
    Array.from({ length: Math.max(totalDePaginas - 1, 0) }, (_, indice) =>
      buscarPagina(indice + 1),
    ),
  )

  // um evento criado entre as páginas desloca a lista e pode repetir o último da página anterior
  const eventosSemRepetir = new Map(
    [primeira, ...demais]
      .flatMap((pagina) => pagina.data)
      .map((evento) => [evento.event_key, evento]),
  )
  return formatarEGuardarDaLista([...eventosSemRepetir.values()], pedido)
}

async function buscarEventoPorChave(eventKey) {
  const pedido = iniciarPedido()
  const [evento, itensDeCotacao] = await Promise.all([
    api.get(`/events/${eventKey}`),
    api.get(`/events/${eventKey}/items`),
  ])
  const formatado = formatarEventoParaExibicao({ ...evento, budget_items: itensDeCotacao })
  guardarEventos([formatado], pedido)
  return formatado
}

const carregamentosEmAndamento = new Map()
const ultimaBuscaPorChave = new Map()
// trocar de aba dentro do evento não precisa buscar de novo o que acabou de chegar
const SEGUNDOS_SEM_BUSCAR_DE_NOVO = 15

export function carregarEvento(eventKey) {
  const buscadoHaPouco =
    Date.now() - (ultimaBuscaPorChave.get(eventKey) ?? 0) < SEGUNDOS_SEM_BUSCAR_DE_NOVO * 1000
  const emMemoria = buscarEventoEmMemoria(eventKey)
  if (buscadoHaPouco && emMemoria && !emMemoria.parcial) return Promise.resolve(emMemoria)

  if (!carregamentosEmAndamento.has(eventKey)) {
    const carregamento = buscarEventoPorChave(eventKey)
      .then((evento) => {
        ultimaBuscaPorChave.set(eventKey, Date.now())
        return evento
      })
      .finally(() => carregamentosEmAndamento.delete(eventKey))
    carregamentosEmAndamento.set(eventKey, carregamento)
  }
  return carregamentosEmAndamento.get(eventKey)
}

// a falha na releitura é ignorada: a mudança já foi salva e repetir duplicaria o item
export function relerEventoEmMemoria(eventKey) {
  ultimaBuscaPorChave.delete(eventKey)
  buscarEventoPorChave(eventKey)
    .then(() => ultimaBuscaPorChave.set(eventKey, Date.now()))
    .catch(() => {})
}

export async function criarEvento(dadosFormulario) {
  const payload = montarPayloadEvento(dadosFormulario)
  const pedido = iniciarPedido()
  const resposta = await api.post('/events', payload)
  esquecerRecentes()
  return formatarEGuardar([resposta], pedido)[0]
}

// a edição não mexe nos custos próprios: eles têm a aba Itens de custo
export async function atualizarEvento(eventKey, dadosFormulario) {
  const payload = montarPayloadEvento(dadosFormulario)
  delete payload.internal_costs
  const pedido = iniciarPedido()
  const resposta = await api.put(`/events/${eventKey}`, payload)
  esquecerRecentes()
  return formatarEGuardar([resposta], pedido)[0]
}

const CENARIO_DO_FORMULARIO = { minimum: 'minimo', expected: 'esperado', maximum: 'maximo' }

const dataDoFormulario = (dataIso) => new Date(dataIso).toLocaleDateString('pt-BR')

function horarioDoFormulario(dataIso, horarioSemPreencher) {
  const horario = new Date(dataIso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
  return horario === horarioSemPreencher ? '' : horario
}

// 0.125 vira "12,5": arredondar para inteiro mudaria a margem a cada edição
const margemDoFormulario = (fracao) =>
  String(Number((Number(fracao) * 100).toFixed(2))).replace('.', ',')

export function eventoParaFormulario(eventoDaApi) {
  const numero = (valor) => (valor ? String(valor) : '')

  return {
    nome: eventoDaApi.name,
    categoria: eventoDaApi.category,
    descricao: eventoDaApi.description ?? '',
    dataInicio: dataDoFormulario(eventoDaApi.start_date),
    dataTermino: dataDoFormulario(eventoDaApi.end_date),
    horarioAbertura: horarioDoFormulario(eventoDaApi.start_date, ABERTURA_SEM_HORARIO),
    horarioEncerramento: horarioDoFormulario(eventoDaApi.end_date, ENCERRAMENTO_SEM_HORARIO),
    nomeEspaco: eventoDaApi.venue_name,
    cep: eventoDaApi.zip_code ? mascararCep(eventoDaApi.zip_code) : '',
    endereco: eventoDaApi.address,
    cidade: eventoDaApi.city,
    estado: eventoDaApi.state,
    capacidadeEspaco: numero(eventoDaApi.venue_capacity),
    publicoMinimo: numero(eventoDaApi.min_audience),
    publicoEsperado: numero(eventoDaApi.expected_audience),
    publicoMaximo: numero(eventoDaApi.max_audience),
    margemLucro: margemDoFormulario(eventoDaApi.profit_margin),
    tetoDeGastos: eventoDaApi.budget_limit ? formatarMoeda(eventoDaApi.budget_limit) : '',
    custosFiscais: '',
    equipeProducao: '',
    outrosCustos: '',
    cenarioReferencia: CENARIO_DO_FORMULARIO[eventoDaApi.reference_scenario] ?? 'esperado',
  }
}

async function mudarStatusDoEvento(eventKey, corpo) {
  const pedido = iniciarPedido()
  const resposta = await api.patch(`/events/${eventKey}/status`, corpo)
  esquecerRecentes()
  return formatarEGuardar([resposta], pedido)[0]
}

export const cancelarEvento = (eventKey, motivo) =>
  mudarStatusDoEvento(eventKey, { status: 'canceled', reason: motivo })

export const aprovarEvento = (eventKey) => mudarStatusDoEvento(eventKey, { status: 'closed' })

const caminhoDosCustos = (eventKey) => `/events/${eventKey}/internal-costs`

const custoParaApi = ({ descricao, tipo, valor }) => ({
  type: tipo,
  description: descricao.trim(),
  amount: paraNumero(valor),
})

export async function incluirCustoProprio(eventKey, custo) {
  const pedido = iniciarPedido()
  const resposta = await api.post(caminhoDosCustos(eventKey), custoParaApi(custo))
  return formatarEGuardar([resposta], pedido)[0]
}

export async function alterarCustoProprio(eventKey, chaveDoCusto, custo) {
  const pedido = iniciarPedido()
  const resposta = await api.put(
    `${caminhoDosCustos(eventKey)}/${chaveDoCusto}`,
    custoParaApi(custo),
  )
  return formatarEGuardar([resposta], pedido)[0]
}

export async function apagarCustoProprio(eventKey, chaveDoCusto) {
  const pedido = iniciarPedido()
  const resposta = await api.delete(`${caminhoDosCustos(eventKey)}/${chaveDoCusto}`)
  return formatarEGuardar([resposta], pedido)[0]
}

export async function listarItensDeCotacao(eventKey) {
  return api.get(`/events/${eventKey}/items`)
}

export async function criarItemDeCotacao(eventKey, item) {
  const resposta = await api.post(`/events/${eventKey}/items`, itemParaApi(item))
  relerEventoEmMemoria(eventKey)
  return resposta
}

export async function atualizarItemDeCotacao(eventKey, itemKey, item) {
  const resposta = await api.put(`/events/${eventKey}/items/${itemKey}`, itemParaApi(item))
  relerEventoEmMemoria(eventKey)
  return resposta
}

export async function excluirItemDeCotacao(eventKey, itemKey) {
  await api.delete(`/events/${eventKey}/items/${itemKey}`)
  relerEventoEmMemoria(eventKey)
}

function itemParaApi(item) {
  const dados = {
    category: item.categoria,
    description: item.descricao.trim(),
    type: item.tipoItem,
    quantity: Number(item.quantidade),
  }
  if (item.valorEstimado !== '') dados.estimated_value = paraNumero(String(item.valorEstimado))
  if (item.observacoes?.trim()) dados.notes = item.observacoes.trim()
  return dados
}

export const publicarEventoParaCotacao = (eventKey) =>
  mudarStatusDoEvento(eventKey, { status: 'open_for_quotes' })
