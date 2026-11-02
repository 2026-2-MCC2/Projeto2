// Normaliza textos digitados pelo usuário antes de buscar ou gravar no banco.
//   TextTools.normalizeEmail('  Maria@Exemplo.COM ')   'maria@exemplo.com'
//   TextTools.onlyDigits('11.222.333/0001-81')         '11222333000181'

export class TextTools {
  // e-mail é gravado e buscado sempre em minúsculas, sem espaços nas pontas
  static normalizeEmail(email) {
    return email.trim().toLowerCase()
  }

  static onlyDigits(value) {
    return String(value).replace(/\D/g, '')
  }
}
