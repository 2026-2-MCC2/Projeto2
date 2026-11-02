import { api } from '../infrastructure/api.js'
import { paraData, paraNumero } from '../domain/validacao.js'
import { digitos, mascararCep } from '../domain/formatacao.js'
import { guardarEventos, iniciarPedido, limparEventosEmMemoria } from './eventosEmMemoria.js'

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

const STATUS_DO_BACKEND_POR_STATUS_DO_FRONT = Object.fromEntries(
  Object.entries(STATUS_DO_FRONT_POR_STATUS_DO_BACKEND).map(([backend, front]) => [front, backend]),
)

// a API diz se o evento ainda aceita edição, para a regra dos status finais ficar só no backend
export const eventoPodeSerEditado = (evento) => evento?.raw?.is_editable ?? false

export function mapearStatusBackend(statusBackend) {
  return STATUS_DO_FRONT_POR_STATUS_DO_BACKEND[statusBackend] ?? 'planejamento'
}

const quantidadeDePessoas = (quantidade) =>
  `${quantidade.toLocaleString('pt-BR')} ${quantidade === 1 ? 'pessoa' : 'pessoas'}`

export function formatarMoeda(valor) {
  if (valor === null || valor === undefined || Number.isNaN(Number(valor))) return 'R$ 0,00'
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

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

export function formatarPeriodoCurto(dataInicioIso, dataTerminoIso) {
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

function calcularDadosTicket(evento, totalCustos) {
  const publicoMin = Number(evento.min_audience) || 1
  const publicoExp = Number(evento.expected_audience) || publicoMin
  const publicoMax = Number(evento.max_audience) || publicoExp
  const margem = Number(evento.profit_margin) || 0

  const cenarioRef = evento.reference_scenario || 'expected'
  const publicoRef =
    cenarioRef === 'minimum' ? publicoMin : cenarioRef === 'maximum' ? publicoMax : publicoExp

  // ticket = custo total ÷ [público × (1 − margem)]
  const ticketPara = (publico) =>
    margem < 1 && totalCustos > 0 ? totalCustos / (publico * (1 - margem)) : 0

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
    explicacao:
      totalCustos > 0
        ? `Custo de ${formatarMoeda(totalCustos)} dividido por ${quantidadeDePessoas(publicoRef)}, com margem de ${Math.round(margem * 100)}%.`
        : 'Cadastre os custos para calcular o ticket sugerido.',
    cenarios: [
      {
        nome: 'Pessimista',
        valor: ticketMinNum > 0 ? formatarMoeda(ticketMinNum) : '—',
        publico: `${quantidadeDePessoas(publicoMin)}`,
        destaque: cenarioRef === 'minimum',
      },
      {
        nome: 'Esperado',
        valor: ticketExpNum > 0 ? formatarMoeda(ticketExpNum) : '—',
        publico: `${quantidadeDePessoas(publicoExp)}`,
        destaque: cenarioRef === 'expected',
      },
      {
        nome: 'Otimista',
        valor: ticketMaxNum > 0 ? formatarMoeda(ticketMaxNum) : '—',
        publico: `${quantidadeDePessoas(publicoMax)}`,
        destaque: cenarioRef === 'maximum',
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
      {
        rotulo: 'Ponto de equilíbrio',
        valor: `${ingressosEquilibrio.toLocaleString('pt-BR')} ingressos`,
      },
      {
        rotulo: 'Margem no cenário base',
        valor: `${formatarMoeda(resultadoDoCenarioBase)} · ${Math.round(margem * 100)}%`,
        positivo: resultadoDoCenarioBase >= 0,
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

/**
 * Converte um objeto Event do Backend para o formato esperado pelos componentes visuais do Frontend.
 */
export function formatarEventoParaExibicao(evento) {
  if (!evento) return null

  const statusFront = mapearStatusBackend(evento.status)
  const periodo = formatarPeriodo(evento.start_date, evento.end_date)
  const periodoCurto = formatarPeriodoCurto(evento.start_date, evento.end_date)
  const local = `${evento.venue_name}, ${evento.state}`
  const publico = `${quantidadeDePessoas(Number(evento.expected_audience || 0))}`

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
    situacao: 'custoProprio',
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
      dadosMobile: dadosExibicao,
      orcamento: {
        consolidado: formatarMoeda(totalCustos),
        previsto: formatarMoeda(totalCustos),
        economia: 'R$ 0,00',
        comprometido: totalCustos > 0 ? 100 : 0,
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

/**
 * Transforma dados do formulário de NovoEvento no payload esperado pelo POST/PUT /events da API.
 */
export function montarPayloadEvento(dados) {
  const { startDate, endDate } = periodoDoEvento(dados)

  const minAudience = Math.round(paraNumero(dados.publicoMinimo)) || 1
  const expectedAudience = Math.round(paraNumero(dados.publicoEsperado)) || minAudience
  const maxAudience = Math.round(paraNumero(dados.publicoMaximo)) || expectedAudience

  const margemNumero = paraNumero(dados.margemLucro)
  const profitMargin = Number.isNaN(margemNumero)
    ? 0.2
    : Math.min(Math.max(Number((margemNumero / 100).toFixed(4)), 0), 0.9999)

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
    zip_code: dados.cep ? digitos(dados.cep) : null,
    venue_capacity: venueCapacity || null,
    min_audience: minAudience,
    expected_audience: expectedAudience,
    max_audience: maxAudience,
    profit_margin: profitMargin,
    reference_scenario: CENARIOS_MAPA[dados.cenarioReferencia] || 'expected',
    internal_costs: internalCosts,
  }
}

// máximo aceito pelo backend
const EVENTOS_POR_PAGINA = 100

function montarBuscaDeEventos({ status, search, limit, page }) {
  const params = new URLSearchParams({ limit: String(limit), page: String(page) })
  if (status && status !== 'todos')
    params.append('status', STATUS_DO_BACKEND_POR_STATUS_DO_FRONT[status] ?? status)
  if (search?.trim()) params.append('search', search.trim())
  return `/events?${params}`
}

function formatarEGuardar(eventosDaApi, pedido) {
  const eventos = eventosDaApi.map(formatarEventoParaExibicao)
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
  limparEventosEmMemoria()
}

export function listarEventosRecentes(quantidade) {
  if (recentesEmCache?.quantidade !== quantidade) {
    const pedido = iniciarPedido()
    const carregamento = api
      .get(montarBuscaDeEventos({ limit: quantidade, page: 0 }))
      .then((resposta) => formatarEGuardar(resposta.data, pedido))
      .catch((falha) => {
        // só esquece se este ainda for o pedido guardado; um mais novo pode ter tomado o lugar
        if (recentesEmCache?.carregamento === carregamento) esquecerRecentes()
        throw falha
      })
    recentesEmCache = { quantidade, carregamento }
  }
  return recentesEmCache.carregamento
}

// busca todas as páginas para a lista nunca esconder eventos
// a primeira página informa o total; as demais são buscadas juntas, e as telas são avisadas uma vez
export async function listarTodosOsEventos({ status, search } = {}) {
  const buscarPagina = (page) =>
    api.get(montarBuscaDeEventos({ status, search, limit: EVENTOS_POR_PAGINA, page }))

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
  return formatarEGuardar([...eventosSemRepetir.values()], pedido)
}

/**
 * Busca um evento específico pela sua event_key.
 */
export async function buscarEventoPorChave(eventKey) {
  const pedido = iniciarPedido()
  const resposta = await api.get(`/events/${eventKey}`)
  return formatarEGuardar([resposta], pedido)[0]
}

const carregamentosEmAndamento = new Map()

export function carregarEvento(eventKey) {
  if (!carregamentosEmAndamento.has(eventKey)) {
    const carregamento = buscarEventoPorChave(eventKey).finally(() =>
      carregamentosEmAndamento.delete(eventKey),
    )
    carregamentosEmAndamento.set(eventKey, carregamento)
  }
  return carregamentosEmAndamento.get(eventKey)
}

/**
 * Cria um novo evento no backend.
 */
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

// o caminho inverso do montarPayloadEvento: preenche o formulário com o evento salvo
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
    custosFiscais: '',
    equipeProducao: '',
    outrosCustos: '',
    cenarioReferencia: CENARIO_DO_FORMULARIO[eventoDaApi.reference_scenario] ?? 'esperado',
  }
}

export async function cancelarEvento(eventKey, motivo) {
  const pedido = iniciarPedido()
  const resposta = await api.patch(`/events/${eventKey}/status`, {
    status: 'canceled',
    reason: motivo,
  })
  esquecerRecentes()
  return formatarEGuardar([resposta], pedido)[0]
}

/**
 * Publica um evento para cotação de fornecedores (RF08).
 */
export async function publicarEventoParaCotacao(eventKey) {
  const pedido = iniciarPedido()
  const resposta = await api.patch(`/events/${eventKey}/status`, { status: 'open_for_quotes' })
  esquecerRecentes()
  return formatarEGuardar([resposta], pedido)[0]
}
