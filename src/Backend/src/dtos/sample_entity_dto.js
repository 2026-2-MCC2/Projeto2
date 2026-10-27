// DTO (Data Transfer Object): o formato dos dados que a API devolve.
// Transforma o objeto que veio do banco no JSON da resposta. Assim a resposta não expõe colunas
// internas (id, status_id) e o formato da API não muda se uma coluna do banco mudar de nome.

export class SampleEntityDTO {
  // Entidade completa. Exemplo de saída:
  //   { "hello": "world", "status": "pending", "sample_entity_key": "6f1c...", "counter": 0 }
  static objToDict(sampleEntity) {
    // copia os campos recebidos no POST (ex.: hello) e acrescenta os outros
    const dto = structuredClone(sampleEntity.sample_entity_data)
    dto.status = sampleEntity.status.enumerator
    dto.sample_entity_key = sampleEntity.sample_entity_key
    dto.counter = sampleEntity.counter

    return dto
  }

  static listObjToListDict(sampleEntitiesList) {
    const sampleEntitiesDictList = []
    for (const sampleEntity of sampleEntitiesList) {
      sampleEntitiesDictList.push(SampleEntityDTO.objToDict(sampleEntity))
    }
    return sampleEntitiesDictList
  }

  // Só a chave. Exemplo de saída: { "sample_entity_key": "6f1c..." }
  static onlyObjKey(sampleEntity) {
    const dto = {}
    dto.sample_entity_key = sampleEntity.sample_entity_key

    return dto
  }
}
