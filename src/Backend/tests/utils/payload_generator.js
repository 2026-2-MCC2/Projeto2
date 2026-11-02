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

  static createEventPayload(overrides = {}) {
    return {
      name: 'Festival Primavera Som & Luz 2026',
      category: 'Festival',
      description: 'Festival de música ao ar livre com três palcos e praça de alimentação.',
      start_date: '2026-10-18T14:00:00.000Z',
      end_date: '2026-10-20T23:00:00.000Z',
      venue_name: 'Allianz Parque',
      address: 'Av. Francisco Matarazzo, 1705',
      city: 'São Paulo',
      state: 'SP',
      zip_code: '05001100',
      venue_capacity: 20000,
      min_audience: 8000,
      expected_audience: 12000,
      max_audience: 15000,
      profit_margin: 0.2,
      reference_scenario: 'expected',
      internal_costs: [
        { type: 'tax', description: 'Custos fiscais e alvarás', amount: 24300.0 },
        { type: 'operational', description: 'Equipe de produção', amount: 17800.0 },
      ],
      ...overrides,
    }
  }

  static createEventUpdatePayload(overrides = {}) {
    return {
      name: 'Festival Primavera Som & Luz 2026 - Edição Especial',
      category: 'Festival',
      description: 'Nova descrição atualizada',
      start_date: '2026-10-19T14:00:00.000Z',
      end_date: '2026-10-21T23:00:00.000Z',
      venue_name: 'Novo Espaço',
      address: 'Nova Rua, 100',
      city: 'São Paulo',
      state: 'SP',
      zip_code: '05001100',
      venue_capacity: 25000,
      min_audience: 9000,
      expected_audience: 13000,
      max_audience: 18000,
      profit_margin: 0.25,
      reference_scenario: 'expected',
      ...overrides,
    }
  }
}
