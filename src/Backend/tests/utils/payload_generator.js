import { randomUUID } from 'node:crypto'

import { RandomGenerator } from './random_generator.js'

export class PayloadGenerator {
  static createOrganizerRegistrationPayload(overrides = {}) {
    const payload = {
      profile: 'organizador',
      name: 'RF01 Organizador Teste',
      email: `rf01-${randomUUID()}@example.test`,
      password: 'senhaForte123',
      cnpj: RandomGenerator.generateCnpj(),
      phone: '(11) 99999-8888',
      ...overrides,
    }
    return payload
  }

  static createSupplierRegistrationPayload(overrides = {}) {
    return PayloadGenerator.createOrganizerRegistrationPayload({
      profile: 'fornecedor',
      name: 'RF02 Fornecedor Teste',
      categories: ['Estrutura'],
      ...overrides,
    })
  }
}
