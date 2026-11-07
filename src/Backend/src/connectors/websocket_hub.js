import { WebSocket, WebSocketServer } from 'ws'

import { API_PREFIX } from '../constants.js'
import { ForbiddenProfile, Unauthorized } from '../errors/index.js'
import { ensureActiveUser } from '../middlewares/user_status.js'
import { ProposalRepository } from '../repositories/proposal_repository.js'
import { Logger } from '../utils/logger.js'
import { SecurityTools } from '../utils/security_tools.js'

export const WEBSOCKET_PATH = `${API_PREFIX}/ws`

const AUTH_TIMEOUT_MS = 10_000
// o Cloud Run derruba conexões paradas; o ping também descobre clientes que sumiram sem fechar
const PING_INTERVAL_MS = 30_000
// conferir a conta no banco a cada ping pesaria no pool; bloqueio já derruba na hora (closeUser)
const REVALIDATION_INTERVAL_MS = 5 * 60_000
// o cliente só manda auth e typing
const MAX_CLIENT_MESSAGE_BYTES = 4 * 1024
// typing chega a cada tecla: repassa no máximo um por segundo e guarda quem é o outro lado de cada conversa
const TYPING_INTERVAL_MS = 1_000
const MAX_CACHED_CONVERSATIONS = 50

export const CLOSE_CODES = Object.freeze({
  UNAUTHORIZED: 4401,
  FORBIDDEN: 4403,
  AUTH_TIMEOUT: 4408,
  SERVER_SHUTDOWN: 1001,
})

// fora de uma requisição não há transação: as leituras usam uma conexão avulsa do pool
const NO_TRANSACTION_CONTEXT = { dbSession: null }

const logger = new Logger(null, 'WebSocketHub')

// hub em memória: a API roda com uma instância só (--max-instances=1 no deploy)
export class WebSocketHub {
  static #server = null
  static #pingTimer = null
  static #socketsByUserKey = new Map()

  static attach(httpServer) {
    const server = new WebSocketServer({ noServer: true, maxPayload: MAX_CLIENT_MESSAGE_BYTES })

    httpServer.on('upgrade', (req, socket, head) => {
      if (req.url.split('?')[0] !== WEBSOCKET_PATH) {
        socket.destroy()
        return
      }
      server.handleUpgrade(req, socket, head, (ws) => WebSocketHub.#onConnection(ws))
    })

    WebSocketHub.#pingTimer = setInterval(() => WebSocketHub.#pingAll(), PING_INTERVAL_MS)
    WebSocketHub.#server = server
  }

  static close() {
    clearInterval(WebSocketHub.#pingTimer)
    WebSocketHub.#server?.clients.forEach((ws) => ws.close(CLOSE_CODES.SERVER_SHUTDOWN, 'Server shutting down'))
    WebSocketHub.#server?.close()
  }

  static isOnline(userKey) {
    return (WebSocketHub.#socketsByUserKey.get(userKey)?.size ?? 0) > 0
  }

  // pushes: [{ userKey, data }]; chamado só depois do commit, para ninguém receber algo que foi desfeito
  static send(pushes) {
    for (const { userKey, data } of pushes) {
      const text = JSON.stringify(data)
      WebSocketHub.#socketsByUserKey.get(userKey)?.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) ws.send(text)
      })
    }
  }

  // fecha os sockets do usuário, por exemplo quando o admin bloqueia a conta
  static closeUser(userKey, code = CLOSE_CODES.FORBIDDEN, reason = 'Forbidden') {
    WebSocketHub.#socketsByUserKey.get(userKey)?.forEach((ws) => ws.close(code, reason))
  }

  static #onConnection(ws) {
    ws.isAlive = true
    ws.userKey = null
    ws.tokenUser = null
    ws.lastTypingAt = 0
    ws.counterparts = new Map()
    ws.authTimer = setTimeout(() => ws.close(CLOSE_CODES.AUTH_TIMEOUT, 'Authentication timeout'), AUTH_TIMEOUT_MS)

    ws.on('pong', () => {
      ws.isAlive = true
    })
    ws.on('message', (raw) => {
      WebSocketHub.#onMessage(ws, raw).catch((error) => logger.error(`WebSocket message failed: ${error.stack}`))
    })
    ws.on('close', () => {
      clearTimeout(ws.authTimer)
      WebSocketHub.#removeSocket(ws)
    })
    ws.on('error', (error) => logger.warning(`WebSocket error: ${error.message}`))
  }

  static async #onMessage(ws, raw) {
    const message = parseJson(raw)
    if (message?.type === 'auth' && ws.userKey === null && !ws.isAuthenticating) {
      await WebSocketHub.#authenticate(ws, message.token)
    } else if (message?.type === 'typing' && ws.userKey !== null && typeof message.proposal_key === 'string') {
      await WebSocketHub.#forwardTyping(ws, message.proposal_key)
    }
  }

  // mesma validação das rotas: JWT válido, conta aprovada, mesmo perfil e emitido depois da última troca de senha
  static async #authenticate(ws, token) {
    ws.isAuthenticating = true
    let tokenUser
    try {
      tokenUser = await SecurityTools.readUserToken(String(token))
      await ensureActiveUser(NO_TRANSACTION_CONTEXT, tokenUser)
    } catch (error) {
      if (error instanceof Unauthorized) return ws.close(CLOSE_CODES.UNAUTHORIZED, 'Unauthorized')
      if (error instanceof ForbiddenProfile) return ws.close(CLOSE_CODES.FORBIDDEN, 'Forbidden')
      throw error
    } finally {
      ws.isAuthenticating = false
    }

    clearTimeout(ws.authTimer)
    if (ws.readyState !== WebSocket.OPEN) return

    ws.userKey = tokenUser.userKey
    ws.tokenUser = tokenUser
    ws.validatedAt = Date.now()
    if (!WebSocketHub.#socketsByUserKey.has(ws.userKey)) WebSocketHub.#socketsByUserKey.set(ws.userKey, new Set())
    WebSocketHub.#socketsByUserKey.get(ws.userKey).add(ws)
    ws.send(JSON.stringify({ type: 'ready' }))
  }

  // só repassa para o outro lado de uma conversa de que o usuário participa
  static async #forwardTyping(ws, proposalKey) {
    const now = Date.now()
    if (now - ws.lastTypingAt < TYPING_INTERVAL_MS) return
    ws.lastTypingAt = now

    if (!ws.counterparts.has(proposalKey)) {
      if (ws.counterparts.size >= MAX_CACHED_CONVERSATIONS) ws.counterparts.clear()
      ws.counterparts.set(proposalKey, await WebSocketHub.#findCounterpart(ws.userKey, proposalKey))
    }
    const counterpartKey = ws.counterparts.get(proposalKey)
    if (counterpartKey) {
      WebSocketHub.send([{ userKey: counterpartKey, data: { type: 'typing', proposal_key: proposalKey } }])
    }
  }

  static async #findCounterpart(userKey, proposalKey) {
    const [party] = await new ProposalRepository(NO_TRANSACTION_CONTEXT).getProposalParties([proposalKey])
    if (!party) return null
    if (party.supplier_user_key === userKey) return party.organizer_user_key
    if (party.organizer_user_key === userKey) return party.supplier_user_key
    return null
  }

  // a conta pode ser bloqueada, trocar a senha ou o token vencer com o socket aberto: confere a cada ping
  static async #revalidate(ws) {
    try {
      if (ws.tokenUser.expiresAt * 1000 <= Date.now()) throw new Unauthorized()
      await ensureActiveUser(NO_TRANSACTION_CONTEXT, ws.tokenUser)
    } catch (error) {
      if (error instanceof Unauthorized) return ws.close(CLOSE_CODES.UNAUTHORIZED, 'Unauthorized')
      if (error instanceof ForbiddenProfile) return ws.close(CLOSE_CODES.FORBIDDEN, 'Forbidden')
      logger.warning(`WebSocket revalidation failed: ${error.message}`)
    }
  }

  static #removeSocket(ws) {
    const sockets = WebSocketHub.#socketsByUserKey.get(ws.userKey)
    if (!sockets) return
    sockets.delete(ws)
    if (sockets.size === 0) WebSocketHub.#socketsByUserKey.delete(ws.userKey)
  }

  static #pingAll() {
    for (const ws of WebSocketHub.#server.clients) {
      if (!ws.isAlive) {
        ws.terminate()
        continue
      }
      ws.isAlive = false
      ws.ping()
      if (ws.tokenUser && Date.now() - ws.validatedAt >= REVALIDATION_INTERVAL_MS) {
        ws.validatedAt = Date.now()
        WebSocketHub.#revalidate(ws)
      }
    }
  }
}

function parseJson(raw) {
  try {
    return JSON.parse(raw.toString('utf8'))
  } catch {
    return null
  }
}
