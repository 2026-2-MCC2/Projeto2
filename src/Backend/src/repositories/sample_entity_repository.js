// Repository: o único lugar que faz consultas ao banco para a entidade SampleEntity.
// O controller chama estes métodos (ex.: getByKey) em vez de consultar o banco direto. Assim, se a
// forma de buscar mudar, só este arquivo muda.
//
// Consultas do Sequelize mais usadas, com o SQL equivalente:
//   await SampleEntity.findOne({ where: { id: 1 } })                SELECT * FROM sample_entity WHERE id = 1 LIMIT 1
//   await SampleEntity.findAll({ where: { counter: 0 }, limit: 10 }) SELECT * FROM sample_entity WHERE counter = 0 LIMIT 10
//   await SampleEntity.findOne({ where: ..., include: 'status' })   o mesmo, trazendo junto o status (JOIN)
//   const sampleEntity = SampleEntity.build(); ...; await sampleEntity.save()   INSERT (ou UPDATE se já existir)
//   await sampleEntity.destroy()                                    DELETE
// Documentação: https://sequelize.org/docs/v6/core-concepts/model-querying-basics/
//
// IMPORTANTE: toda consulta recebe { transaction: this.session }, para fazer parte da transação
// da requisição (ver middlewares/session_manager.js). Sem isso a consulta roda fora dela e o
// commit/rollback não vale para ela.
//
// Todo acesso ao banco demora um pouco, por isso os métodos são "async" e quem chama usa "await"
// (espera o resultado antes de seguir para a próxima linha).

import { randomUUID } from 'node:crypto'

import { SampleEntity, SampleEntityStatus, SampleEntityStatusEvent } from '../models/index.js'

export class SampleEntityRepository {
  constructor(context) {
    this.session = context.dbSession
  }

  async create(sampleEntityData) {
    const createdStatus = await this.getSampleEntityStatus('created')

    const sampleEntity = SampleEntity.build()
    sampleEntity.sample_entity_data = sampleEntityData
    sampleEntity.sample_entity_key = randomUUID()
    sampleEntity.counter = 0
    sampleEntity.status_id = createdStatus.id

    await sampleEntity.save({ transaction: this.session })
    return sampleEntity
  }

  // troca o status e grava o evento no histórico (sample_entity_status_event)
  async updateStatus(sampleEntity, newStatusEnumerator) {
    const newStatus = await this.getSampleEntityStatus(newStatusEnumerator)

    sampleEntity.status_id = newStatus.id
    await sampleEntity.save({ transaction: this.session })

    const newStatusEvent = SampleEntityStatusEvent.build()
    newStatusEvent.sample_entity_id = sampleEntity.id
    newStatusEvent.status_id = newStatus.id
    newStatusEvent.event_datetime = new Date()
    await newStatusEvent.save({ transaction: this.session })
  }

  // devolve a entidade já com o status, ou null se a chave não existir
  async getByKey(sampleEntityKey) {
    return SampleEntity.findOne({
      where: { sample_entity_key: sampleEntityKey },
      include: 'status',
      transaction: this.session,
    })
  }

  // Igual ao getByKey, mas trava a linha até o commit (SELECT ... FOR UPDATE).
  // Se duas requisições tentarem mudar a mesma entidade ao mesmo tempo, a segunda espera a primeira
  // terminar e já lê o status atualizado.
  async getByKeyForUpdate(sampleEntityKey) {
    return SampleEntity.findOne({
      where: { sample_entity_key: sampleEntityKey },
      include: 'status',
      lock: this.session.LOCK.UPDATE,
      transaction: this.session,
    })
  }

  // Lista paginada. Se statusModel vier, filtra por esse status.
  // Busca um item a mais que o limite só para saber se existe próxima página.
  async getList(limit, offset, statusModel) {
    const where = {}
    if (statusModel !== null) {
      where.status_id = statusModel.id
    }

    return SampleEntity.findAll({
      where: where,
      include: 'status',
      order: [['id', 'ASC']],
      limit: limit + 1,
      offset: offset,
      transaction: this.session,
    })
  }

  // Soma 1 no contador direto no banco (UPDATE ... SET counter = counter + 1). Assim, duas
  // chamadas ao mesmo tempo não se sobrescrevem.
  async incrementCounter(sampleEntity) {
    await sampleEntity.increment('counter', { by: 1, transaction: this.session })
  }

  // busca um status pelo nome (ex.: 'pending'); devolve null se não existir
  async getSampleEntityStatus(enumerator) {
    return SampleEntityStatus.findOne({
      where: { enumerator: enumerator },
      transaction: this.session,
    })
  }
}
