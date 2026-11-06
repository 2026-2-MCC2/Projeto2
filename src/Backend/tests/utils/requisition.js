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

class BaseConnectorResponse {
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
