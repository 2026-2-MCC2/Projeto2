const NORMALIZED_CNPJ_PATTERN = /^[A-Z0-9]{12}[0-9]{2}$/
const ALL_SAME_CHARACTER = /^(.)\1+$/

// na regra da Receita cada caractere vale o código ASCII menos 48: '0' a '9' valem 0 a 9, 'A' vale 17
const cnpjCharacterValue = (character) => character.charCodeAt(0) - 48

export class DocumentTools {
  static normalizeCnpj(documentNumber) {
    return String(documentNumber)
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
  }

  static isValidCnpj(documentNumber) {
    const cnpj = DocumentTools.normalizeCnpj(documentNumber)
    if (!NORMALIZED_CNPJ_PATTERN.test(cnpj) || ALL_SAME_CHARACTER.test(cnpj)) {
      return false
    }

    const charactersFromRight = cnpj.split('').reverse()
    for (const position of [2, 1]) {
      let sum = 0
      charactersFromRight.slice(position).forEach((character, index) => {
        sum += cnpjCharacterValue(character) * (2 + (index % 8))
      })

      const verificationDigit = ((sum * 10) % 11) % 10
      if (charactersFromRight[position - 1] !== String(verificationDigit)) {
        return false
      }
    }
    return true
  }
}
