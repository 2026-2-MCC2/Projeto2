// Gera CPF e CNPJ válidos (com dígitos verificadores corretos) para usar nos testes.
//   RandomGenerator.generateCpf()    ex.: '529.982.247-25'
//   RandomGenerator.generateCnpj()   ex.: '11.222.333/0001-81'

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
