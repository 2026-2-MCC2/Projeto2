// Monta bodies de requisição válidos para os testes, com valores padrão.
//   PayloadGenerator.createSampleEntityPayload()         { hello: 'world' }
//   PayloadGenerator.createSampleEntityPayload('oi')     { hello: 'oi' }
//   PayloadGenerator.createNewStatusPayload('success')   { status: 'success' }
//   PayloadGenerator.createOrganizerRegistrationPayload()   cadastro de organizador com e-mail e CNPJ únicos

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

  static createSampleEntityPayload(hello = 'world') {
    const payload = { hello: hello }
    return payload
  }

  static createNewStatusPayload(newStatus) {
    const payload = { status: newStatus }
    return payload
  }
}
