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

  static async PUT_admin_user_status(userKey, updatePayload, headers = {}) {
    const response = await ClientRequisition.send('PUT', `/event_planning/admin/users/${userKey}/status`, {
      payload: updatePayload,
      headers: headers,
    })
    return [response.responseStatus, response.responseJson]
  }
}
