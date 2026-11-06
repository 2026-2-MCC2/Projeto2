export class TextTools {
  static normalizeEmail(email) {
    return email.trim().toLowerCase()
  }

  static onlyDigits(value) {
    return String(value).replace(/\D/g, '')
  }

  static formatCurrency(value) {
    return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }
}
