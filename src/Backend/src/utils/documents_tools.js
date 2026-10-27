// Valida CPF e CNPJ (formato e dígitos verificadores).
//
// Exemplos:
//   DocumentTools.isValidCpf('529.982.247-25')       true
//   DocumentTools.isValidCpf('529.982.247-26')       false (dígito verificador errado)
//   DocumentTools.isValidCpf('52998224725')          false (CPF só é aceito com pontuação)
//   DocumentTools.isValidCnpj('11.222.333/0001-81')  true
//   DocumentTools.isValidCnpj('11222333000181')      true  (CNPJ aceita com ou sem pontuação)
//   DocumentTools.isValidCnpj('00.000.000/0000-00')  false (todos os dígitos iguais)
//
// Os dígitos verificadores são os dois últimos números: são calculados a partir dos outros, então
// um número digitado errado quase sempre dá um dígito verificador diferente.

const CNPJ_PATTERN = /^([0-9]{2}[.]?[0-9]{3}[.]?[0-9]{3}[/]?[0-9]{4}[-]?[0-9]{2})/
const CPF_PATTERN = /^([0-9]{3}[.]?[0-9]{3}[.]?[0-9]{3}[-]?[0-9]{2})$/
const ALL_SAME_DIGIT = /^(\d)\1+$/

export class DocumentTools {
  static isValidCnpj(documentNumber) {
    const validSize = 14

    if (!CNPJ_PATTERN.test(documentNumber)) {
      return false
    }

    const cnpj = documentNumber.replace(/[^0-9]/g, '')
    if (cnpj.length !== validSize) {
      return false
    }
    if (ALL_SAME_DIGIT.test(cnpj)) {
      return false
    }

    // Cada dígito verificador é a soma dos dígitos anteriores multiplicados por pesos
    // 2, 3, ..., 9, 2, 3... (contando da direita para a esquerda).
    const digitsFromRight = cnpj.split('').reverse()
    for (const position of [2, 1]) {
      let sum = 0
      digitsFromRight.slice(position).forEach((digit, index) => {
        sum += Number(digit) * (2 + (index % 8))
      })

      const verificationDigit = ((sum * 10) % 11) % 10
      if (digitsFromRight[position - 1] !== String(verificationDigit)) {
        return false
      }
    }
    return true
  }

  static isValidCpf(documentNumber) {
    const validSize = 11

    if (!CPF_PATTERN.test(documentNumber)) {
      return false
    }
    if (documentNumber.length !== 14) {
      return false
    }

    const cpf = documentNumber.replace(/[^0-9]/g, '')
    if (cpf.length !== validSize) {
      return false
    }
    if (ALL_SAME_DIGIT.test(cpf)) {
      return false
    }

    const firstVerificationDigit = DocumentTools.calculateCpfDigit(cpf, true)
    const lastVerificationDigit = DocumentTools.calculateCpfDigit(cpf, false)

    return cpf.slice(-2) === `${firstVerificationDigit}${lastVerificationDigit}`
  }

  // pesos usados no cálculo, ex.: generateCpfFactories(10) -> [10, 9, 8, 7, 6, 5, 4, 3, 2]
  static generateCpfFactories(factory, minFactory = 2) {
    const factories = []
    for (let value = factory; value >= minFactory; value--) {
      factories.push(value)
    }
    return factories
  }

  // 1º dígito: os 9 primeiros números multiplicados pelos pesos 10 a 2
  // 2º dígito: os 10 primeiros números multiplicados pelos pesos 11 a 2
  static calculateCpfDigit(cpf, isFirstDigit = true) {
    const factory = isFirstDigit ? 10 : 11
    const factories = DocumentTools.generateCpfFactories(factory)

    let resultSum = 0
    factories.forEach((factor, index) => {
      resultSum += factor * Number(cpf[index])
    })

    const rest = resultSum % 11
    if (rest < 2) {
      return 0
    }
    return 11 - rest
  }
}
