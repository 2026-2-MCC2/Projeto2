// Roda uma vez antes de todos os testes:
//   1. cria no emulador do Secret Manager os secrets que a API precisa
//   2. espera a API responder, porque os containers podem ainda estar subindo
//
// Os testes são de integração: fazem requisições HTTP de verdade para a API rodando no Docker,
// que por sua vez usa o MySQL de verdade. Por isso, antes de "npm test" rode "docker compose up -d --build".

import { setTimeout as sleep } from 'node:timers/promises'

import { createLocalSecrets } from './utils/local_secrets.js'
import { API_URL } from './utils/requisition.js'

export async function globalSetup() {
  await retryFor60Seconds('Secret Manager emulator', createLocalSecrets)
  await retryFor60Seconds('API', checkApiIsUp)
}

// erro para quando a porta responde, mas quem responde é outra aplicação
class PortUsedByAnotherApplication extends Error {}

async function checkApiIsUp() {
  // se nada estiver ouvindo na porta, o fetch dá erro e o retry tenta de novo
  const response = await fetch(`${API_URL}/event_planning/health_check`)

  if (response.status !== 204) {
    throw new PortUsedByAnotherApplication(
      `${API_URL} respondeu, mas não é esta API (o health check devolveu ${response.status} em vez de 204). ` +
        'Outra aplicação deve estar usando a porta. Pare essa aplicação e rode "docker compose down && docker compose up -d", ' +
        'ou use outra porta: "API_PORT=3400 docker compose up -d" e "API_PORT=3400 npm test".',
    )
  }
}

// tenta de novo a cada 1 segundo, por até 60 segundos
async function retryFor60Seconds(description, action) {
  const deadline = Date.now() + 60_000

  while (true) {
    try {
      await action()
      return
    } catch (error) {
      // não adianta esperar: a porta está com outra aplicação
      if (error instanceof PortUsedByAnotherApplication) {
        throw error
      }
      if (Date.now() > deadline) {
        throw new Error(`${description} não respondeu. Você rodou "docker compose up -d"?`, { cause: error })
      }
      await sleep(1_000)
    }
  }
}
