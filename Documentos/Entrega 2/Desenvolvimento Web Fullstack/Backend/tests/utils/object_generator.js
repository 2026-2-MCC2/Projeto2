import assert from 'node:assert/strict'

import { DbUtils } from './db_utils.js'
import { PayloadGenerator } from './payload_generator.js'
import { RequestGenerator } from './request_generator.js'

export class ObjectGenerator {
  static async createUserFixture(options) {
    return DbUtils.createUserFixture(options)
  }

  // começa daqui a 20 dias e termina daqui a 30; por padrão já fica em cotação
  static async createEventWithItems(organizerHeaders, { categories = ['Estrutura'], publish = true } = {}) {
    const [eventStatus, event] = await RequestGenerator.POST_events(
      PayloadGenerator.createEventPayload({
        start_date: `${PayloadGenerator.dateFromToday(20)}T14:00:00.000Z`,
        end_date: `${PayloadGenerator.dateFromToday(30)}T23:00:00.000Z`,
      }),
      organizerHeaders,
    )
    assert.equal(eventStatus, 201)

    const items = []
    for (const category of categories) {
      const [itemStatus, item] = await RequestGenerator.POST_event_item(
        event.event_key,
        PayloadGenerator.createBudgetItemPayload({ category, description: `${category} do evento` }),
        organizerHeaders,
      )
      assert.equal(itemStatus, 201)
      items.push(item)
    }

    if (publish) {
      const [publishStatus] = await RequestGenerator.PATCH_event_status(event.event_key, { status: 'open_for_quotes' }, organizerHeaders)
      assert.equal(publishStatus, 200)
    }

    return { event, items }
  }

  static async sendProposal(eventKey, itemKey, supplierHeaders, overrides) {
    const [status, proposal] = await RequestGenerator.POST_supplier_item_proposal(
      eventKey,
      itemKey,
      PayloadGenerator.createSupplierProposalPayload(overrides),
      supplierHeaders,
    )
    assert.equal(status, 201)
    return proposal
  }
}
