import nodemailer from 'nodemailer'

import { EMAIL_FROM, SMTP_CREDENTIALS_SECRET_NAME, SMTP_HOST, SMTP_PORT } from '../constants.js'
import { Logger } from '../utils/logger.js'
import { SecretManagerConnector } from './secret_manager_connector.js'

const logger = new Logger(null, 'EmailConnector')
const MAX_ATTEMPTS = 3

class TransportCache {
  static transport = null
}

async function getTransport() {
  if (TransportCache.transport === null) {
    const credentials = SMTP_CREDENTIALS_SECRET_NAME
      ? JSON.parse(await SecretManagerConnector.getSecretByName(SMTP_CREDENTIALS_SECRET_NAME))
      : null

    // porta 465 já abre com TLS; nas outras (587) o nodemailer sobe para TLS com STARTTLS, como o gmail exige
    TransportCache.transport = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: credentials ? { user: credentials.user, pass: credentials.password } : undefined,
    })
  }
  return TransportCache.transport
}

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

export class EmailConnector {
  static async send({ to, subject, html, text }) {
    const transport = await getTransport()

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        await transport.sendMail({ from: EMAIL_FROM, to, subject, html, text })
        return
      } catch (error) {
        if (attempt === MAX_ATTEMPTS) throw error
        // espera 1s e depois 4s: cobre uma queda curta do servidor de e-mail
        await wait(attempt ** 2 * 1000)
      }
    }
  }

  // envio fora do caminho da requisição: uma falha no e-mail vira log e não derruba a resposta
  static sendInBackground(email) {
    EmailConnector.send(email).catch((error) => {
      logger.error(`Email to ${maskEmail(email.to)} failed: ${error.message}`)
    })
  }
}

function maskEmail(email) {
  const [name, domain] = email.split('@')
  return `${name.slice(0, 2)}***@${domain}`
}
