// Controller: as regras de negócio da SampleEntity, ou seja, o que a aplicação decide.
// Recebe dados já validados do resource, usa o repository para ler/gravar e devolve o DTO.
// Erros de regra de negócio são lançados com throw (ex.: throw new NotFoundSampleEntity(key))
// e viram a resposta HTTP certa automaticamente.
//
// Regras desta entidade de exemplo:
//   - ao criar, a entidade passa de "created" para "pending"
//   - só uma entidade "pending" pode mudar de status (para "success" ou "failed")
//   - o webhook soma 1 no contador (webhook é um endpoint que outro sistema chama para avisar
//     que algo aconteceu, ex.: "o pagamento foi aprovado")
//
// Todo método que grava no banco termina com await this.session.commit(). Depois do commit a
// sessão não pode mais ser usada, então ele é sempre o último acesso ao banco do método.

import { SampleEntityDTO } from '../dtos/sample_entity_dto.js'
import { InvalidParameter, NotFoundSampleEntity, SampleEntityFinalStatus } from '../errors/index.js'
import { SampleEntityRepository } from '../repositories/sample_entity_repository.js'
import { BaseController } from './base_controller.js'

export class SampleEntityController extends BaseController {
  constructor(context) {
    super(context, 'SampleEntityController')
    this.sampleEntityRepository = new SampleEntityRepository(context)
  }

  async create(sampleEntitySchema) {
    this.logger.debug('Creating a new Sample Entity')

    const sampleEntity = await this.sampleEntityRepository.create(sampleEntitySchema)

    await this.sampleEntityRepository.updateStatus(sampleEntity, 'pending')

    const sampleEntityDto = SampleEntityDTO.onlyObjKey(sampleEntity)
    await this.session.commit()

    return sampleEntityDto
  }

  async getByKey(sampleEntityKey) {
    this.logger.debug(`Fetching Entity with key ${sampleEntityKey}`)

    const sampleEntity = await this.sampleEntityRepository.getByKey(sampleEntityKey)

    if (sampleEntity === null) {
      throw new NotFoundSampleEntity(sampleEntityKey)
    }

    return SampleEntityDTO.objToDict(sampleEntity)
  }

  async getList(limit, offset, filtersDict) {
    let statusModel = null

    const statusStr = filtersDict.status
    if (statusStr !== undefined) {
      statusModel = await this.sampleEntityRepository.getSampleEntityStatus(statusStr)
      if (statusModel === null) {
        throw new InvalidParameter(`The "status" parameter is invalid. Status ${statusStr} does not exist.`)
      }
    }

    let sampleEntitiesList = await this.sampleEntityRepository.getList(limit, offset, statusModel)

    // o repository busca um item a mais: se ele veio, existe próxima página
    let isLastPage = true
    if (sampleEntitiesList.length > limit) {
      isLastPage = false
      sampleEntitiesList = sampleEntitiesList.slice(0, -1)
    }

    const sampleEntitiesListDto = SampleEntityDTO.listObjToListDict(sampleEntitiesList)
    return { sampleEntitiesListDto: sampleEntitiesListDto, isLastPage: isLastPage }
  }

  async updateStatus(sampleEntityKey, updatePayload) {
    const sampleEntity = await this.sampleEntityRepository.getByKeyForUpdate(sampleEntityKey)

    if (sampleEntity === null) {
      throw new NotFoundSampleEntity(sampleEntityKey)
    }

    const oldStatus = sampleEntity.status.enumerator
    const newStatus = updatePayload.status

    if (oldStatus !== 'pending') {
      throw new SampleEntityFinalStatus(oldStatus, newStatus)
    }

    await this.sampleEntityRepository.updateStatus(sampleEntity, newStatus)

    const sampleEntityDto = SampleEntityDTO.onlyObjKey(sampleEntity)
    await this.session.commit()

    return sampleEntityDto
  }

  async webhookIncrementCounter(sampleEntityKey) {
    this.logger.debug(`Processing webhook Entity with key ${sampleEntityKey}`)

    const sampleEntity = await this.sampleEntityRepository.getByKey(sampleEntityKey)

    if (sampleEntity === null) {
      throw new NotFoundSampleEntity(sampleEntityKey)
    }

    await this.sampleEntityRepository.incrementCounter(sampleEntity)

    await this.session.commit()
  }
}
