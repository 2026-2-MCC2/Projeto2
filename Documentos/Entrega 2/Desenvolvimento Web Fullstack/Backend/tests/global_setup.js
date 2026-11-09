import { setTimeout as sleep } from 'node:timers/promises'

import { createLocalSecrets } from './utils/local_secrets.js'
import { DbUtils } from './utils/db_utils.js'
import { API_URL } from './utils/requisition.js'

export const TEST_ORGANIZER_KEY = '00000000-0000-4000-8000-000000000010'
export const TEST_SUPPLIER_KEY = '00000000-0000-4000-8000-000000000011'

export async function globalSetup() {
  await retryFor60Seconds('Secret Manager emulator', createLocalSecrets)
  await retryFor60Seconds('API', checkApiIsUp)

  await DbUtils.ensureApprovedTestUser({ userKey: TEST_ORGANIZER_KEY, profile: 'organizador' })
  await DbUtils.ensureApprovedTestUser({ userKey: TEST_SUPPLIER_KEY, profile: 'fornecedor' })
}

export async function globalTeardown() {
  await DbUtils.deleteUserFixtures([TEST_ORGANIZER_KEY, TEST_SUPPLIER_KEY])
}

// a porta responde, mas quem responde é outra aplicação
class PortUsedByAnotherApplication extends Error {}

async function checkApiIsUp() {
  const response = await fetch(`${API_URL}/event_planning/health_check`)

  if (response.status !== 204) {
    throw new PortUsedByAnotherApplication(
      `${API_URL} respondeu, mas não é esta API (o health check devolveu ${response.status} em vez de 204). ` +
        'Outra aplicação deve estar usando a porta. Pare essa aplicação e rode "docker compose down && docker compose up -d", ' +
        'ou use outra porta: "API_PORT=3400 docker compose up -d" e "API_PORT=3400 npm test".',
    )
  }
}

async function retryFor60Seconds(description, action) {
  const deadline = Date.now() + 60_000

  while (true) {
    try {
      await action()
      return
    } catch (error) {
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
