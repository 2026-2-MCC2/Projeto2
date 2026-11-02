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

  // Cálculo simplificado do ticket estimado sobre os custos próprios atuais
  const publicoRef = Number(evento.expected_audience) || 1
  const margem = Number(evento.profit_margin) || 0
  const totalCustos = Number(evento.total_internal_cost) || 0
  const valorTicket = margem < 1 && totalCustos > 0 ? totalCustos / (publicoRef * (1 - margem)) : 0
  const ticket = valorTicket > 0 ? formatarMoeda(valorTicket) : 'A calcular'

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
    categoria: custo.type === 'tax' ? 'Fiscal' : custo.type === 'operational' ? 'Operacional' : 'Outros',
    origem: 'Custo próprio',
    valor: formatarMoeda(custo.amount),
  }))

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
    ticket,
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
      itens: [],
      totalDeItens: 0,
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
  const profitMargin = Number.isNaN(margemNumero) ? 0.2 : Math.min(Math.max(margemNumero / 100, 0), 0.99)

  const venueCapacity = dados.capacidadeEspaco ? Math.round(paraNumero(dados.capacidadeEspaco)) : null

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
