import { ClientRequisition } from './requisition.js'

export class RequestGenerator {
  static async GET_me(headers = {}) {
    const response = await ClientRequisition.send('GET', '/event_planning/me', { headers: headers })
    return [response.responseStatus, response.responseJson]
  }

  static async POST_auth_cadastro(registrationPayload, headers = {}) {
    const response = await ClientRequisition.send('POST', '/event_planning/auth/cadastro', {
      payload: registrationPayload,
      headers: headers,
    })
    return [response.responseStatus, response.responseJson]
  }

  static async POST_auth_login(loginPayload) {
    const response = await ClientRequisition.send('POST', '/event_planning/auth/login', { payload: loginPayload })
    return [response.responseStatus, response.responseJson]
  }

  static async GET_admin_users(params = {}, headers = {}) {
    const response = await ClientRequisition.send('GET', '/event_planning/admin/users', {
      headers: headers,
      queryParams: params,
    })
    return [response.responseStatus, response.responseJson]
  }

  static async GET_admin_reports(params = {}, headers = {}) {
    const response = await ClientRequisition.send('GET', '/event_planning/admin/reports', {
      headers: headers,
      queryParams: params,
    })
    return [response.responseStatus, response.responseJson]
  }

  static async PUT_admin_user_status(userKey, updatePayload, headers = {}) {
    const response = await ClientRequisition.send('PUT', `/event_planning/admin/users/${userKey}/status`, {
      payload: updatePayload,
      headers: headers,
    })
    return [response.responseStatus, response.responseJson]
  }

  static async POST_admin_user_password_reset(userKey, headers = {}) {
    const response = await ClientRequisition.send('POST', `/event_planning/admin/users/${userKey}/redefinicao-de-senha`, {
      headers: headers,
    })
    return [response.responseStatus, response.responseJson]
  }

  static async POST_auth_esqueci_senha(payload) {
    const response = await ClientRequisition.send('POST', '/event_planning/auth/esqueci-senha', { payload: payload })
    return [response.responseStatus, response.responseJson]
  }

  static async POST_auth_redefinir_senha(payload) {
    const response = await ClientRequisition.send('POST', '/event_planning/auth/redefinir-senha', { payload: payload })
    return [response.responseStatus, response.responseJson]
  }

  static async POST_events(payload, headers = {}) {
    const response = await ClientRequisition.send('POST', '/event_planning/events', {
      payload: payload,
      headers: headers,
    })
    return [response.responseStatus, response.responseJson]
  }

  static async GET_events(params = {}, headers = {}) {
    const response = await ClientRequisition.send('GET', '/event_planning/events', {
      headers: headers,
      queryParams: params,
    })
    return [response.responseStatus, response.responseJson]
  }

  static async GET_event_by_key(eventKey, headers = {}) {
    const response = await ClientRequisition.send('GET', `/event_planning/events/${eventKey}`, {
      headers: headers,
    })
    return [response.responseStatus, response.responseJson]
  }

  static async GET_event_proposals(eventKey, headers = {}) {
    const response = await ClientRequisition.send('GET', `/event_planning/events/${eventKey}/proposals`, {
      headers: headers,
    })
    return [response.responseStatus, response.responseJson]
  }

  static async POST_event_proposal_accept(eventKey, proposalKey, headers = {}) {
    const response = await ClientRequisition.send('POST', `/event_planning/events/${eventKey}/proposals/${proposalKey}/accept`, {
      headers: headers,
    })
    return [response.responseStatus, response.responseJson]
  }

  static async PUT_event_by_key(eventKey, payload, headers = {}) {
    const response = await ClientRequisition.send('PUT', `/event_planning/events/${eventKey}`, {
      payload: payload,
      headers: headers,
    })
    return [response.responseStatus, response.responseJson]
  }

  static async PATCH_event_status(eventKey, statusPayload, headers = {}) {
    const response = await ClientRequisition.send('PATCH', `/event_planning/events/${eventKey}/status`, {
      payload: statusPayload,
      headers: headers,
    })
    return [response.responseStatus, response.responseJson]
  }

  static async POST_event_internal_cost(eventKey, costPayload, headers = {}) {
    const response = await ClientRequisition.send('POST', `/event_planning/events/${eventKey}/internal-costs`, {
      payload: costPayload,
      headers: headers,
    })
    return [response.responseStatus, response.responseJson]
  }

  static async PUT_event_internal_cost(eventKey, costKey, costPayload, headers = {}) {
    const response = await ClientRequisition.send('PUT', `/event_planning/events/${eventKey}/internal-costs/${costKey}`, {
      payload: costPayload,
      headers: headers,
    })
    return [response.responseStatus, response.responseJson]
  }

  static async DELETE_event_internal_cost(eventKey, costKey, headers = {}) {
    const response = await ClientRequisition.send('DELETE', `/event_planning/events/${eventKey}/internal-costs/${costKey}`, {
      headers: headers,
    })
    return [response.responseStatus, response.responseJson]
  }

  static async POST_event_item(eventKey, payload, headers = {}) {
    const response = await ClientRequisition.send('POST', `/event_planning/events/${eventKey}/items`, {
      payload,
      headers,
    })
    return [response.responseStatus, response.responseJson]
  }

  static async GET_event_items(eventKey, headers = {}) {
    const response = await ClientRequisition.send('GET', `/event_planning/events/${eventKey}/items`, { headers })
    return [response.responseStatus, response.responseJson]
  }

  static async GET_supplier_events(params = {}, headers = {}) {
    const response = await ClientRequisition.send('GET', '/event_planning/supplier/events', {
      headers,
      queryParams: params,
    })
    return [response.responseStatus, response.responseJson]
  }

  static async GET_supplier_event_by_key(eventKey, headers = {}) {
    const response = await ClientRequisition.send('GET', `/event_planning/supplier/events/${eventKey}`, { headers })
    return [response.responseStatus, response.responseJson]
  }

  static async PUT_event_item(eventKey, itemKey, payload, headers = {}) {
    const response = await ClientRequisition.send('PUT', `/event_planning/events/${eventKey}/items/${itemKey}`, {
      payload,
      headers,
    })
    return [response.responseStatus, response.responseJson]
  }

  static async DELETE_event_item(eventKey, itemKey, headers = {}) {
    const response = await ClientRequisition.send('DELETE', `/event_planning/events/${eventKey}/items/${itemKey}`, { headers })
    return [response.responseStatus, response.responseJson]
  }

  static async PATCH_me(payload, headers = {}) {
    const response = await ClientRequisition.send('PATCH', '/event_planning/me', { payload: payload, headers: headers })
    return [response.responseStatus, response.responseJson]
  }

  static async PUT_me_categorias(payload, headers = {}) {
    const response = await ClientRequisition.send('PUT', '/event_planning/me/categorias', { payload: payload, headers: headers })
    return [response.responseStatus, response.responseJson]
  }

  static async PUT_me_senha(payload, headers = {}) {
    const response = await ClientRequisition.send('PUT', '/event_planning/me/senha', { payload: payload, headers: headers })
    return [response.responseStatus, response.responseJson]
  }

  static async POST_auth_verificar_cnpj(payload) {
    const response = await ClientRequisition.send('POST', '/event_planning/auth/verificar-cnpj', { payload: payload })
    return [response.responseStatus, response.responseJson]
  }
}
