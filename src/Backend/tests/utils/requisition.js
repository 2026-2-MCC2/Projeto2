// Faz requisições HTTP para a API que está rodando no Docker.
//
// Exemplo:
//   const response = await ClientRequisition.send('GET', '/event_planning/health_check')
//   response.responseStatus   204
//   response.responseJson     body convertido de JSON (null se não tiver body)
//   response.response         resposta completa, ex.: response.response.headers.get('server')
//
// Opções:
//   payload      objeto enviado como JSON no body
//   data         texto enviado como está no body (ex.: para testar JSON mal formado)
//   headers      ex.: { Authorization: 'Bearer <token>' } (ver token_generator.js)
//   queryParams  ex.: { limit: 2 } vira ?limit=2

// endereço da API; se mudou a porta no docker-compose (API_PORT), os testes acompanham
export const API_URL = process.env.API_URL ?? `http://localhost:${process.env.API_PORT ?? 3300}`

export class ClientRequisition {
  static async send(method, endpoint, { payload, data, headers = {}, queryParams = {} } = {}) {
    const url = new URL(endpoint, API_URL)
    for (const [name, value] of Object.entries(queryParams)) {
      url.searchParams.append(name, String(value))
    }

    let body = data
    let requestHeaders = headers
    if (payload !== undefined) {
      body = JSON.stringify(payload)
      requestHeaders = { 'Content-Type': 'application/json', ...headers }
    }

    const response = await fetch(url, { method: method, headers: requestHeaders, body: body })

    return new BaseConnectorResponse(response, await response.text())
  }
}

export class BaseConnectorResponse {
  constructor(response, responseText) {
    this.response = response
    this.responseStatus = response.status

    try {
      this.responseJson = JSON.parse(responseText)
    } catch {
      this.responseJson = null
    }
  }
}
