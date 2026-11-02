// lê os e-mails que a API mandou para o Mailpit do docker-compose (MAILPIT_WEB_PORT, se a porta mudou)

import { setTimeout as sleep } from 'node:timers/promises'

const MAILPIT_URL = process.env.MAILPIT_URL ?? `http://localhost:${process.env.MAILPIT_WEB_PORT ?? 8025}`

async function getJson(path) {
  const response = await fetch(new URL(path, MAILPIT_URL))
  if (!response.ok) throw new Error(`Mailpit respondeu ${response.status} em ${path}`)
  return response.json()
}

export class Mailpit {
  static async listEmailsTo(address) {
    const query = encodeURIComponent(`to:"${address}"`)
    const { messages } = await getJson(`/api/v1/search?query=${query}`)
    return messages
  }

  // o envio acontece depois da resposta da API, então espera o e-mail chegar
  static async waitForEmailTo(address, { timeoutMs = 10_000, expectedCount = 1 } = {}) {
    const deadline = Date.now() + timeoutMs

    while (Date.now() < deadline) {
      const messages = await Mailpit.listEmailsTo(address)
      if (messages.length >= expectedCount) {
        const message = await getJson(`/api/v1/message/${messages[0].ID}`)
        return { subject: message.Subject, html: message.HTML, text: message.Text }
      }
      await sleep(200)
    }
    throw new Error(`Nenhum e-mail chegou para ${address}`)
  }

  // para confirmar que um e-mail NÃO foi enviado, dá tempo de um envio em segundo plano chegar
  static async countEmailsAfterWaiting(address, waitMs = 1_500) {
    await sleep(waitMs)
    return (await Mailpit.listEmailsTo(address)).length
  }

  static extractResetToken(email) {
    const [, token] = email.text.match(/redefinir-senha\?token=([\w-]+)/) ?? []
    if (token === undefined) throw new Error('O e-mail não tem link de redefinição de senha')
    return token
  }
}
