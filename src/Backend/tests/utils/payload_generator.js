// Monta bodies de requisição válidos para os testes, com valores padrão.
//   PayloadGenerator.createSampleEntityPayload()         { hello: 'world' }
//   PayloadGenerator.createSampleEntityPayload('oi')     { hello: 'oi' }
//   PayloadGenerator.createNewStatusPayload('success')   { status: 'success' }

export class PayloadGenerator {
  static createSampleEntityPayload(hello = 'world') {
    const payload = { hello: hello }
    return payload
  }

  static createNewStatusPayload(newStatus) {
    const payload = { status: newStatus }
    return payload
  }
}
