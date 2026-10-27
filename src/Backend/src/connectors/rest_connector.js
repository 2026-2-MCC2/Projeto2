// Base para chamar APIs externas (de outros serviços ou de terceiros).
// Já faz o que toda chamada precisa: repassa o GlobalTraceId, loga a requisição e a resposta,
// aplica timeout e lança BaseConnectorException se a resposta vier com erro (status >= 300).
//
// Exemplo: connector para a API de CEP do ViaCEP
//
//   import { RestConnector } from './rest_connector.js'
//
//   export class ViaCepConnector extends RestConnector {
//     constructor(context) {
//       super(context, 'ViaCepConnector', 'https://viacep.com.br', 10_000) // timeout de 10s
//     }
//
//     async getAddress(cep) {
//       const response = await this.send({ endpoint: `/ws/${cep}/json/`, method: 'GET' })
//       return response.responseJson // { cep: '01001-000', logradouro: 'Praça da Sé', ... }
//     }
//   }
//
//   // num controller:
//   const viaCepConnector = new ViaCepConnector(this.context)
//   const address = await viaCepConnector.getAddress('01001000')
//
// Opções do send:
//   endpoint, method       obrigatórios
//   payload                objeto enviado como JSON
//   headers                headers extras, ex.: { Authorization: 'Bearer ...' }
//   params                 query string, ex.: { page: '1' } vira ?page=1
//   timeoutMs              sobrescreve o timeout padrão do connector
//   hideOutgoingJson       não loga o payload enviado (use para dados sensíveis)
//   hideIncomingJson       não loga a resposta recebida

import { Logger } from '../utils/logger.js'

export class RestConnector {
  constructor(context, className, baseUrl, timeoutMs) {
    this.context = context
    this.logger = new Logger(context, className)
    this.baseUrl = baseUrl
    this.timeoutMs = timeoutMs
  }

  async send({ endpoint, method, payload, headers = {}, params, timeoutMs, hideOutgoingJson = false, hideIncomingJson = false }) {
    const url = new URL(`${this.baseUrl}${endpoint}`)
    for (const [name, value] of Object.entries(params ?? {})) {
      url.searchParams.append(name, value)
    }

    const requestHeaders = { ...headers, GlobalTraceId: this.context.globalTraceId }
    let body
    if (payload !== undefined) {
      requestHeaders['Content-Type'] = 'application/json'
      body = JSON.stringify(payload)
    }

    const toLogJson = {}
    if (params !== undefined) {
      toLogJson.params = params
    }
    if (payload !== undefined && !hideOutgoingJson) {
      toLogJson.payload = payload
    }
    this.logger.info(`OUTGOING REQUEST ${method} ${url}`, toLogJson)

    const start = Date.now()
    const response = await fetch(url, {
      method: method.toUpperCase(),
      headers: requestHeaders,
      body: body,
      signal: AbortSignal.timeout(timeoutMs ?? this.timeoutMs),
    })
    const responseText = await response.text()
    const took = Date.now() - start

    const baseResponse = new BaseConnectorResponse(endpoint, method, payload, response, responseText)

    let incomingLog = { payload: baseResponse.responseJson ?? responseText }
    if (hideIncomingJson) {
      incomingLog = 'HIDDEN'
    }
    this.logger.info(`INCOMING RESPONSE ${response.status} ${method} ${url} ${took} ms`, incomingLog)

    if (baseResponse.responseStatus >= 300) {
      throw new BaseConnectorException(baseResponse)
    }

    return baseResponse
  }
}

// Resposta de uma chamada feita pelo RestConnector.
//   responseStatus  status HTTP (ex.: 200)
//   responseJson    body convertido de JSON (null se não for JSON)
//   responseText    body como texto
export class BaseConnectorResponse {
  constructor(endpoint, method, payload, response, responseText) {
    this.endpoint = endpoint
    this.method = method
    this.payload = payload
    this.response = response
    this.responseStatus = response.status
    this.responseText = responseText

    try {
      this.responseJson = JSON.parse(responseText)
    } catch {
      this.responseJson = null
    }
  }

  toString() {
    return `Response(method=${this.method}, endpoint=${this.endpoint}, status=${this.responseStatus})`
  }
}

// Erro lançado quando a API chamada responde com status >= 300.
// Exemplo de tratamento:
//   try {
//     await viaCepConnector.getAddress(cep)
//   } catch (error) {
//     if (error instanceof BaseConnectorException && error.baseResponse.responseStatus === 404) { ... }
//     throw error
//   }
export class BaseConnectorException extends Error {
  constructor(baseResponse) {
    super(baseResponse.toString())
    this.baseResponse = baseResponse
  }
}
