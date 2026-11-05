export class TextTools {
  static normalizeEmail(email) {
    return email.trim().toLowerCase()
  }

  static onlyDigits(value) {
    return String(value).replace(/\D/g, '')
  }

  // 49800 → "R$ 49.800,00", no formato que o organizador e o fornecedor veem nas telas
  static formatCurrency(value) {
    return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }
}
