import { once } from 'node:events'

import { WebSocket } from 'ws'

import { API_URL } from './requisition.js'

const WEBSOCKET_BASE_URL = API_URL.replace(/^http/, 'ws')

// guarda tudo que chega, para o teste esperar uma mensagem que pode ter chegado antes do waitFor
export class WebSocketClient {
  static async connect(path = '/event_planning/ws') {
    const socket = new WebSocket(`${WEBSOCKET_BASE_URL}${path}`)
    const client = new WebSocketClient(socket)
    await once(socket, 'open')
    return client
  }

  static async connectAs(token) {
    const client = await WebSocketClient.connect()
    client.send({ type: 'auth', token })
    await client.waitFor((message) => message.type === 'ready')
    return client
  }

  constructor(socket) {
    this.socket = socket
    this.received = []
    this.waiters = []
    this.closed = new Promise((resolve) => {
      socket.on('close', (code, reason) => resolve({ code, reason: reason.toString() }))
    })

    socket.on('message', (raw) => {
      const message = JSON.parse(raw.toString())
      this.received.push(message)
      this.waiters = this.waiters.filter((waiter) => !waiter.tryResolve(message))
    })
  }

  send(data) {
    this.socket.send(JSON.stringify(data))
  }

  waitFor(predicate, timeoutMs = 3_000) {
    const alreadyReceived = this.received.find(predicate)
    if (alreadyReceived) return Promise.resolve(alreadyReceived)

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('A mensagem esperada não chegou pelo WebSocket.')), timeoutMs)
      this.waiters.push({
        tryResolve: (message) => {
          if (!predicate(message)) return false
          clearTimeout(timer)
          resolve(message)
          return true
        },
      })
    })
  }

  async close() {
    if (this.socket.readyState !== WebSocket.CLOSED) {
      this.socket.close()
      await this.closed
    }
  }
}
