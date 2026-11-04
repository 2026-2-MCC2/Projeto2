// Gera CPF e CNPJ válidos (com dígitos verificadores corretos) para usar nos testes.
//   RandomGenerator.generateCpf()    ex.: '529.982.247-25'
//   RandomGenerator.generateCnpj()   ex.: '11.222.333/0001-81'
//   RandomGenerator.generateAlphanumericCnpj()   ex.: '12.ABC.345/01DE-35'

import { randomInt } from 'node:crypto'

export class RandomGenerator {
  static generateCpf() {
    const cpf = randomDigits(9)
    for (let i = 0; i < 2; i++) {
      let sum = 0
      cpf.forEach((digit, index) => {
        sum += (cpf.length + 1 - index) * digit
      })
      const rest = sum % 11
      cpf.push(rest > 1 ? 11 - rest : 0)
    }

    const cpfNumber = cpf.join('')
    return `${cpfNumber.slice(0, 3)}.${cpfNumber.slice(3, 6)}.${cpfNumber.slice(6, 9)}-${cpfNumber.slice(9, 11)}`
  }

  // regra da Receita para o CNPJ alfanumérico: cada caractere vale o código ASCII menos 48
  static generateAlphanumericCnpj() {
    const allowed = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    const base = Array.from({ length: 12 }, () => allowed[randomInt(0, allowed.length)]).join('')
    let cnpj = base
    for (let i = 0; i < 2; i++) {
      const sum = [...cnpj].reverse().reduce((total, character, index) => total + (character.charCodeAt(0) - 48) * ((index % 8) + 2), 0)
      const rest = sum % 11
      cnpj += rest < 2 ? 0 : 11 - rest
    }
    return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`
  }

  static generateCnpj() {
    const cnpj = [...randomDigits(8), 0, 0, 0, 1]
    for (let i = 0; i < 2; i++) {
      const digitsFromRight = [...cnpj].reverse()
      let sum = 0
      digitsFromRight.forEach((digit, index) => {
        sum += digit * ((index % 8) + 2)
      })
      const digit = 11 - (sum % 11)
      cnpj.push(digit < 10 ? digit : 0)
    }

    const cnpjNumber = cnpj.join('')
    return `${cnpjNumber.slice(0, 2)}.${cnpjNumber.slice(2, 5)}.${cnpjNumber.slice(5, 8)}/${cnpjNumber.slice(8, 12)}-${cnpjNumber.slice(12, 14)}`
  }
}

function randomDigits(amount) {
  const digits = []
  for (let i = 0; i < amount; i++) {
    digits.push(randomInt(10))
  }
  return digits
}
