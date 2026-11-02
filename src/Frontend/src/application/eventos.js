import { api } from '../infrastructure/api.js'
import { paraData, paraNumero } from '../domain/validacao.js'
import { registrarEventoCache } from '../presentation/data/eventos.js'

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

export function mapearStatusBackend(statusBackend) {
  switch (statusBackend) {
    case 'draft':
      return 'planejamento'
    case 'open_for_quotes':
      return 'cotacao'
    case 'closed':
      return 'aprovado'
    case 'canceled':
      return 'cancelado'
    default:
      return 'planejamento'
  }
}

export function formatarMoeda(valor) {
  if (valor === null || valor === undefined || Number.isNaN(Number(valor))) return 'R$ 0,00'
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatarPeriodo(dataInicioIso, dataTerminoIso) {
  if (!dataInicioIso) return 'A definir'
  const inicio = new Date(dataInicioIso)
  const termino = dataTerminoIso ? new Date(dataTerminoIso) : inicio

  const diaInicio = inicio.getUTCDate()
  const mesInicio = MESES[inicio.getUTCMonth()]
  const anoInicio = inicio.getUTCFullYear()

  const diaTermino = termino.getUTCDate()
  const mesTermino = MESES[termino.getUTCMonth()]
  const anoTermino = termino.getUTCFullYear()

  if (anoInicio === anoTermino && mesInicio === mesTermino) {
    return diaInicio === diaTermino
      ? `${diaInicio} ${mesInicio} ${anoInicio}`
      : `${diaInicio}–${diaTermino} ${mesInicio} ${anoInicio}`
  }

  return `${diaInicio} ${mesInicio} a ${diaTermino} ${mesTermino} ${anoTermino}`
}

export function formatarPeriodoCurto(dataInicioIso, dataTerminoIso) {
  if (!dataInicioIso) return ''
  const inicio = new Date(dataInicioIso)
  const termino = dataTerminoIso ? new Date(dataTerminoIso) : inicio

  const diaInicio = inicio.getUTCDate()
  const mesInicio = MESES[inicio.getUTCMonth()]

  const diaTermino = termino.getUTCDate()
  const mesTermino = MESES[termino.getUTCMonth()]

  return mesInicio === mesTermino
    ? `${diaInicio}–${diaTermino} ${mesInicio}`
    : `${diaInicio} ${mesInicio}–${diaTermino} ${mesTermino}`
}

function calcularDadosTicket(evento, totalCustos) {
  const publicoMin = Number(evento.min_audience) || 1
  const publicoExp = Number(evento.expected_audience) || publicoMin
  const publicoMax = Number(evento.max_audience) || publicoExp
  const margem = Number(evento.profit_margin) || 0

  const cenarioRef = evento.reference_scenario || 'expected'
  const publicoRef =
    cenarioRef === 'minimum' ? publicoMin : cenarioRef === 'maximum' ? publicoMax : publicoExp

  const precoSugeridoNum =
    margem < 1 && totalCustos > 0 ? totalCustos / (publicoRef * (1 - margem)) : 0
  const precoSugerido = precoSugeridoNum > 0 ? formatarMoeda(precoSugeridoNum) : 'A calcular'

  const ticketMinNum = margem < 1 && totalCustos > 0 ? totalCustos / (publicoMin * (1 - margem)) : 0
  const ticketExpNum = margem < 1 && totalCustos > 0 ? totalCustos / (publicoExp * (1 - margem)) : 0
  const ticketMaxNum = margem < 1 && totalCustos > 0 ? totalCustos / (publicoMax * (1 - margem)) : 0

  const ticketEstimado = {
    cenario:
      cenarioRef === 'minimum'
        ? 'Cenário mínimo'
        : cenarioRef === 'maximum'
          ? 'Cenário máximo'
          : 'Cenário esperado',
    valor: precoSugerido,
    explicacao:
      totalCustos > 0
        ? `Custo de ${formatarMoeda(totalCustos)} dividido por ${publicoRef.toLocaleString('pt-BR')} pessoas, com margem de ${Math.round(margem * 100)}%.`
        : 'Cadastre os custos para calcular o ticket sugerido.',
    cenarios: [
      {
        nome: 'Pessimista',
        valor: ticketMinNum > 0 ? formatarMoeda(ticketMinNum) : '—',
        publico: `${publicoMin.toLocaleString('pt-BR')} pessoas`,
      },
      {
        nome: 'Esperado',
        valor: ticketExpNum > 0 ? formatarMoeda(ticketExpNum) : '—',
        publico: `${publicoExp.toLocaleString('pt-BR')} pessoas`,
        destaque: cenarioRef === 'expected',
      },
      {
        nome: 'Otimista',
        valor: ticketMaxNum > 0 ? formatarMoeda(ticketMaxNum) : '—',
        publico: `${publicoMax.toLocaleString('pt-BR')} pessoas`,
      },
    ],
  }

  if (totalCustos <= 0 || precoSugeridoNum <= 0) {
    return { precoSugerido, ticketEstimado, calculo: null }
  }

  const ingressosEquilibrio = Math.ceil(totalCustos / precoSugeridoNum)
  const receitaMin = publicoMin * precoSugeridoNum
  const resultadoMin = receitaMin - totalCustos

  const receitaExp = publicoExp * precoSugeridoNum
  const resultadoExp = receitaExp - totalCustos

  const receitaMax = publicoMax * precoSugeridoNum
  const resultadoMax = receitaMax - totalCustos

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
        publico: `${publicoMin.toLocaleString('pt-BR')} pessoas`,
        resultado: formatarResultado(resultadoMin),
        positivo: resultadoMin >= 0,
        receita: formatarMoeda(receitaMin),
        base: cenarioRef === 'minimum',
      },
      {
        nome: 'Realista',
        etiqueta: 'cenário base',
        publico: `${publicoExp.toLocaleString('pt-BR')} pessoas`,
        resultado: formatarResultado(resultadoExp),
        positivo: resultadoExp >= 0,
        receita: formatarMoeda(receitaExp),
        base: cenarioRef === 'expected',
      },
      {
        nome: 'Otimista',
        publico: `${publicoMax.toLocaleString('pt-BR')} pessoas`,
        resultado: formatarResultado(resultadoMax),
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
      {
        rotulo: 'Ponto de equilíbrio',
        valor: `${ingressosEquilibrio.toLocaleString('pt-BR')} ingressos`,
      },
      {
        rotulo: 'Margem no cenário base',
        valor: `${formatarMoeda(resultadoExp)} · ${Math.round(margem * 100)}%`,
        positivo: resultadoExp >= 0,
      },
    ],
    formula: 'Ticket = Custo total ÷ [Público × (1 − Margem)]',
    premissas: [
      { rotulo: 'Custo consolidado', valor: formatarMoeda(totalCustos) },
      { rotulo: 'Margem de lucro', valor: `${Math.round(margem * 100)}%` },
      { rotulo: 'Público mínimo', valor: publicoMin.toLocaleString('pt-BR') },
      { rotulo: 'Público esperado', valor: publicoExp.toLocaleString('pt-BR') },
      { rotulo: 'Público máximo', valor: publicoMax.toLocaleString('pt-BR') },
      { rotulo: 'Arredondamento', valor: '2 casas decimais' },
    ],
  }

  return { precoSugerido, ticketEstimado, calculo }
}

function calcularAndamento(statusBackend, internalCostsCount) {
  const isQuotes = statusBackend === 'open_for_quotes'
  const isClosed = statusBackend === 'closed'

  return [
    { nome: 'Evento cadastrado', situacao: 'concluida' },
    {
      nome: 'Itens de custo definidos',
      situacao: isClosed || isQuotes || internalCostsCount > 0 ? 'concluida' : 'atual',
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

/**
 * Converte um objeto Event do Backend para o formato esperado pelos componentes visuais do Frontend.
 */
export function formatarEventoParaExibicao(evento) {
  if (!evento) return null

  const statusFront = mapearStatusBackend(evento.status)
  const periodo = formatarPeriodo(evento.start_date, evento.end_date)
  const periodoCurto = formatarPeriodoCurto(evento.start_date, evento.end_date)
  const local = `${evento.venue_name}, ${evento.state}`
  const publico = `${Number(evento.expected_audience || 0).toLocaleString('pt-BR')} pessoas`

  const totalCustos = Number(evento.total_internal_cost) || 0
  const { precoSugerido, ticketEstimado, calculo } = calcularDadosTicket(evento, totalCustos)

  const dadosExibicao = [
    { rotulo: 'PERÍODO', valor: periodo },
    { rotulo: 'LOCAL', valor: `${evento.venue_name}, ${evento.city} — ${evento.state}` },
    {
      rotulo: 'PÚBLICO',
      valor: `${Number(evento.min_audience).toLocaleString('pt-BR')} · ${Number(evento.expected_audience).toLocaleString('pt-BR')} · ${Number(evento.max_audience).toLocaleString('pt-BR')}`,
    },
    { rotulo: 'MARGEM DE LUCRO', valor: `${Math.round(Number(evento.profit_margin) * 100)}%` },
    { rotulo: 'TIPO DE INGRESSO', valor: 'Inteira' },
  ]

  const linhasCustos = (evento.internal_costs || []).map((custo) => ({
    nome: custo.description,
    categoria:
      custo.type === 'tax' ? 'Fiscal' : custo.type === 'operational' ? 'Operacional' : 'Outros',
    origem: 'Custo próprio',
    valor: formatarMoeda(custo.amount),
  }))

  const itens = (evento.internal_costs || []).map((custo) => ({
    nome: custo.description,
    categoria:
      custo.type === 'tax' ? 'Fiscal' : custo.type === 'operational' ? 'Operacional' : 'Outros',
    situacao: 'aceita',
    valor: formatarMoeda(custo.amount),
  }))

  const andamento = calcularAndamento(evento.status, (evento.internal_costs || []).length)

  const formatado = {
    id: evento.event_key,
    event_key: evento.event_key,
    nome: evento.name,
    category: evento.category,
    status: statusFront,
    statusReal: evento.status,
    periodo,
    periodoCurto,
    local,
    publico,
    ticket: precoSugerido,
    raw: evento,
    detalhe: {
      nomeCompleto: evento.name,
      resumo: `${periodo}  ·  ${evento.venue_name}, ${evento.city}  ·  ${publico} esperadas`,
      resumoMobile: `${periodo} · ${STATUS_FRONTEND[statusFront]?.nome ?? 'Em planejamento'}`,
      dados: dadosExibicao,
      dadosMobile: dadosExibicao,
      orcamento: {
        consolidado: formatarMoeda(totalCustos),
        previsto: formatarMoeda(totalCustos),
        economia: 'R$ 0,00',
        comprometido: 100,
      },
      itens,
      totalDeItens: itens.length,
      propostas: [],
      ticketEstimado,
      calculo,
      andamento,
      comparacao: { itens: [] },
      custos: {
        total: formatarMoeda(totalCustos),
        resumoMobile: `${linhasCustos.length} custos cadastrados`,
        indicadores: [
          { nome: 'Custos de fornecedores', valor: 'R$ 0,00' },
          { nome: 'Custos fiscais e operacionais', valor: formatarMoeda(totalCustos) },
          { nome: 'Custo total do evento', valor: formatarMoeda(totalCustos) },
        ],
        linhas: linhasCustos,
      },
    },
  }

  registrarEventoCache(formatado)
  return formatado
}

/**
 * Converte data (DD/MM/AAAA) e horário (HH:MM) para string ISO (UTC).
 */
function mesclarDataEHorario(dataTexto, horarioTexto) {
  const data = paraData(dataTexto)
  if (!data) return new Date().toISOString()

  let horas = 12
  let minutos = 0
  if (horarioTexto && /^([01]\d|2[0-3]):[0-5]\d$/.test(horarioTexto)) {
    const [h, m] = horarioTexto.split(':').map(Number)
    horas = h
    minutos = m
  }

  // Cria com as horas locais e converte para ISO
  data.setHours(horas, minutos, 0, 0)
  return data.toISOString()
}

/**
 * Transforma dados do formulário de NovoEvento no payload esperado pelo POST/PUT /events da API.
 */
export function montarPayloadEvento(dados) {
  const startDate = mesclarDataEHorario(dados.dataInicio, dados.horarioAbertura)
  const endDate = mesclarDataEHorario(dados.dataTermino, dados.horarioEncerramento)

  const minAudience = Math.round(paraNumero(dados.publicoMinimo)) || 1
  const expectedAudience = Math.round(paraNumero(dados.publicoEsperado)) || minAudience
  const maxAudience = Math.round(paraNumero(dados.publicoMaximo)) || expectedAudience

  const margemNumero = paraNumero(dados.margemLucro)
  const profitMargin = Number.isNaN(margemNumero)
    ? 0.2
    : Math.min(Math.max(margemNumero / 100, 0), 0.99)

  const venueCapacity = dados.capacidadeEspaco
    ? Math.round(paraNumero(dados.capacidadeEspaco))
    : null

  const internalCosts = []
  const valorFiscais = paraNumero(dados.custosFiscais)
  if (!Number.isNaN(valorFiscais) && valorFiscais > 0) {
    internalCosts.push({
      type: 'tax',
      description: 'Custos fiscais e alvarás',
      amount: valorFiscais,
    })
  }

  const valorProducao = paraNumero(dados.equipeProducao)
  if (!Number.isNaN(valorProducao) && valorProducao > 0) {
    internalCosts.push({
      type: 'operational',
      description: 'Equipe de produção',
      amount: valorProducao,
    })
  }

  const valorOutros = paraNumero(dados.outrosCustos)
  if (!Number.isNaN(valorOutros) && valorOutros > 0) {
    internalCosts.push({
      type: 'other',
      description: 'Outros custos variáveis',
      amount: valorOutros,
    })
  }

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
    zip_code: dados.cep ? dados.cep.replace(/\D/g, '') : null,
    venue_capacity: venueCapacity && venueCapacity >= maxAudience ? venueCapacity : null,
    min_audience: minAudience,
    expected_audience: expectedAudience,
    max_audience: maxAudience,
    profit_margin: profitMargin,
    reference_scenario: CENARIOS_MAPA[dados.cenarioReferencia] || 'expected',
    status: 'draft',
    internal_costs: internalCosts,
  }
}

/**
 * Busca a lista de eventos do organizador logado via API.
 */
export async function listarEventos({ status, search, limit = 50, page = 0 } = {}) {
  const params = new URLSearchParams()
  if (status && status !== 'todos') {
    // se o filtro vier como status do frontend, converte para o backend
    const invertido = { planejamento: 'draft', cotacao: 'open_for_quotes', aprovado: 'closed' }
    params.append('status', invertido[status] || status)
  }
  if (search && search.trim() !== '') {
    params.append('search', search.trim())
  }
  params.append('limit', String(limit))
  params.append('page', String(page))

  const qs = params.toString() ? `?${params.toString()}` : ''
  const resposta = await api.get(`/events${qs}`)

  return {
    ...resposta,
    data: (resposta?.data || []).map(formatarEventoParaExibicao),
  }
}

/**
 * Busca um evento específico pela sua event_key.
 */
export async function buscarEventoPorChave(eventKey) {
  const resposta = await api.get(`/events/${eventKey}`)
  return formatarEventoParaExibicao(resposta)
}

/**
 * Cria um novo evento no backend.
 */
export async function criarEvento(dadosFormulario) {
  const payload = montarPayloadEvento(dadosFormulario)
  const resposta = await api.post('/events', payload)
  return formatarEventoParaExibicao(resposta)
}

/**
 * Publica um evento para cotação de fornecedores (RF08).
 */
export async function publicarEventoParaCotacao(eventKey) {
  const resposta = await api.patch(`/events/${eventKey}/status`, { status: 'open_for_quotes' })
  return formatarEventoParaExibicao(resposta)
}
